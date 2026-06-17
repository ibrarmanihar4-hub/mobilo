import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";
import RouteMap, { RouteMapStop } from "../components/RouteMap";
import MatchingOverlay from "../components/MatchingOverlay";
import TripProgress, { TripPhase } from "../components/TripProgress";

import { formatCurrency, rideConfigs } from "../constants/rideCatalog";
import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radii, shadows } from "../theme/theme";
import { useBookingHistory } from "../context/BookingHistoryContext";
import {
  cancelTrip,
  fetchDriver,
  requestDispatch,
  subscribeToDriverLocation,
  subscribeToTrip,
  subscribeToTripDriverLocation,
  type DriverRow,
  type LiveLocation,
  type TripRow,
} from "../services/tripsRepo";
import { getLayoutMetrics } from "../utils/responsive";

type DirectRideStatusRouteProp = RouteProp<
  RootStackParamList,
  "DirectRideStatus"
>;

const methodLabels: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  wallet: "Wallet",
  cash: "Cash on board",
};

// Per-phase hero copy + accent. Each active phase looks visually distinct.
const phaseTheme: Record<
  Exclude<TripRow["status"], "requested">,
  { title: string; sub: string; accent: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  assigned: {
    title: "Driver on the way",
    sub: "Your driver is heading to the pickup point",
    accent: colors.primary,
    icon: "car-sport",
  },
  arriving: {
    title: "Driver arriving",
    sub: "Your driver is almost at your pickup",
    accent: colors.warning,
    icon: "location",
  },
  ongoing: {
    title: "On the trip",
    sub: "Sit back and enjoy the ride",
    accent: colors.accent,
    icon: "navigate",
  },
  completed: {
    title: "Trip completed",
    sub: "Thanks for riding with Mobilo",
    accent: colors.accentDeep,
    icon: "checkmark-circle",
  },
  cancelled: {
    title: "Trip cancelled",
    sub: "This trip was cancelled",
    accent: colors.danger,
    icon: "close-circle",
  },
};

export default function DirectRideStatusScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DirectRideStatusRouteProp>();
  const insets = useSafeAreaInsets();
  const { addBooking } = useBookingHistory();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);
  const recorded = useRef(false);

  const {
    tripId,
    selectedRide,
    sourceLocation,
    destinationLocation,
    fare,
    paymentMethod,
    paymentReference,
    bookingCode,
    otp,
  } = route.params;

  const ride = rideConfigs[selectedRide];
  const pickupLabel = sourceLocation.isCurrentLocation
    ? "Current Location"
    : sourceLocation.name;

  const [status, setStatus] = useState<TripRow["status"]>("requested");
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [liveLoc, setLiveLoc] = useState<LiveLocation | null>(null);
  const [searchSeconds, setSearchSeconds] = useState(0);

  const mapHeight = layout.isTablet
    ? Math.min(Math.max(height * 0.3, 260), 340)
    : Math.min(Math.max(height * 0.26, 220), 300);

  const isMatching = status === "requested";
  const isActive =
    status === "assigned" || status === "arriving" || status === "ongoing";
  const isCompleted = status === "completed";
  const isCancelled = status === "cancelled";

  // Watch the trip row for status + driver assignment changes.
  useEffect(() => {
    const unsubscribe = subscribeToTrip(tripId, (trip) => {
      setStatus(trip.status);
      if (trip.driver_id && (!driver || driver.id !== trip.driver_id)) {
        void fetchDriver(trip.driver_id).then((d) => d && setDriver(d));
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Searching timer + keep dispatch rolling while unmatched.
  useEffect(() => {
    if (status !== "requested") return;
    const tick = setInterval(() => setSearchSeconds((s) => s + 1), 1000);
    const dispatch = setInterval(() => {
      void requestDispatch(tripId);
    }, 18000);
    return () => {
      clearInterval(tick);
      clearInterval(dispatch);
    };
  }, [status, tripId]);

  // Once a driver is assigned, watch their live location (broadcast + DB seed).
  useEffect(() => {
    if (!driver?.id) return;
    const unsubDb = subscribeToDriverLocation(driver.id, (d) =>
      setDriver((prev) => (prev ? { ...prev, ...d } : d))
    );
    const unsubLive = subscribeToTripDriverLocation(tripId, (loc) =>
      setLiveLoc(loc)
    );
    return () => {
      unsubDb();
      unsubLive();
    };
  }, [driver?.id, tripId]);

  // Record the booking to history once (when assigned or later).
  useEffect(() => {
    if (recorded.current) return;
    if (status === "requested") return;
    addBooking({
      bookingCode,
      rideType: selectedRide,
      title: ride.title,
      route: `${pickupLabel} → ${destinationLocation.name}`,
      time: `Today · ${methodLabels[paymentMethod] || "Paid"}`,
      fare: formatCurrency(fare),
      status: status === "completed" ? "Completed" : "Ongoing",
      icon: ride.icon,
      accent: ride.accent,
    });
    recorded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const driverLat = liveLoc?.lat ?? driver?.current_lat ?? null;
  const driverLng = liveLoc?.lng ?? driver?.current_lng ?? null;
  const hasDriverLoc = driverLat != null && driverLng != null;

  const mapStops: RouteMapStop[] = [];
  if (hasDriverLoc) {
    mapStops.push({
      id: "driver",
      name: driver?.full_name ?? "Driver",
      latitude: driverLat as number,
      longitude: driverLng as number,
      highlight: "source",
    });
  }
  mapStops.push({
    id: "pickup",
    name: pickupLabel,
    latitude: sourceLocation.lat,
    longitude: sourceLocation.lng,
    highlight: "pickup",
  });
  mapStops.push({
    id: "drop",
    name: destinationLocation.name,
    latitude: destinationLocation.lat,
    longitude: destinationLocation.lng,
    highlight: "dest",
  });

  const handleCancel = async () => {
    await cancelTrip(tripId);
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  const goHome = () =>
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });

  const theme = !isMatching ? phaseTheme[status] : null;
  const showOtp = status === "assigned" || status === "arriving";

  // ----- MATCHING STATE: dedicated full-screen loader -----
  if (isMatching) {
    return (
      <ScreenBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <View style={styles.matchingContainer}>
            <MatchingOverlay
              icon={ride.icon}
              rideTitle={ride.title}
              elapsedSeconds={searchSeconds}
            />

            <View style={styles.matchingFooter}>
              <View style={styles.miniRoute}>
                <View style={styles.miniRow}>
                  <View style={[styles.miniDot, { backgroundColor: colors.ink }]} />
                  <Text style={styles.miniText} numberOfLines={1}>
                    {pickupLabel}
                  </Text>
                </View>
                <View style={styles.miniLine} />
                <View style={styles.miniRow}>
                  <View style={[styles.miniDot, { backgroundColor: colors.hot }]} />
                  <Text style={styles.miniText} numberOfLines={1}>
                    {destinationLocation.name}
                  </Text>
                </View>
              </View>

              <GradientButton
                label="Cancel search"
                variant="danger"
                onPress={handleCancel}
              />
            </View>
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  // ----- ACTIVE / COMPLETED / CANCELLED STATES -----
  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader title={theme!.title} subtitle={theme!.sub} />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Phase stepper (hidden once cancelled) */}
            {!isCancelled ? (
              <View style={styles.stepperCard}>
                <TripProgress phase={status as TripPhase} />
              </View>
            ) : null}

            {/* Completed / cancelled hero, or live map for active trips */}
            {isCompleted || isCancelled ? (
              <View style={[styles.card, styles.resultCard]}>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: theme!.accent },
                  ]}
                >
                  <Ionicons name={theme!.icon} size={34} color="#FFFFFF" />
                </View>
                <Text style={styles.resultTitle}>{theme!.title}</Text>
                <Text style={styles.resultSub}>{theme!.sub}</Text>
                {isCompleted ? (
                  <View style={styles.fareSummary}>
                    <Text style={styles.fareSummaryLabel}>Total paid</Text>
                    <Text style={styles.fareSummaryValue}>
                      {formatCurrency(fare)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <RouteMap
                stops={mapStops}
                polylineStops={mapStops.filter((s) => s.id !== "driver")}
                height={mapHeight}
                badge={hasDriverLoc ? "Live" : undefined}
                style={{ marginTop: 14 }}
              />
            )}

            {/* Driver card — shown for active + completed */}
            {driver && !isCancelled ? (
              <View style={styles.card}>
                <View style={styles.driverRow}>
                  <View style={[styles.avatar, { backgroundColor: theme!.accent }]}>
                    <Text style={styles.avatarText}>
                      {driver.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.driverName}>{driver.full_name}</Text>
                    <Text style={styles.driverMeta}>
                      {driver.vehicle_label || ride.title}
                    </Text>
                    <Text style={styles.driverPlate}>
                      {driver.vehicle_plate || "—"}
                    </Text>
                  </View>
                  <View style={styles.ratingPill}>
                    <Ionicons name="star" size={12} color={colors.warning} />
                    <Text style={styles.ratingText}>
                      {driver.rating?.toFixed(1) ?? "5.0"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* OTP — only before the ride starts */}
            {showOtp ? (
              <View style={styles.otpCard}>
                <Text style={styles.otpTitle}>Share this OTP at pickup</Text>
                <Text style={styles.otpValue}>{otp}</Text>
                <Text style={styles.otpHelp}>
                  Verify the driver and vehicle plate before sharing.
                </Text>
              </View>
            ) : null}

            {/* Trip details */}
            <View style={styles.card}>
              <Row label="Booking" value={bookingCode} />
              <Divider />
              <Row label="Pickup" value={pickupLabel} />
              <Divider />
              <Row label="Dropoff" value={destinationLocation.name} />
              <Divider />
              <Row label="Method" value={methodLabels[paymentMethod] || "Paid"} last />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {driver?.phone && isActive ? (
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={() => Linking.openURL(`tel:${driver.phone}`)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="call" size={16} color={colors.ink} />
                  <Text style={styles.secondaryText}>Call</Text>
                </TouchableOpacity>
              ) : null}

              {status === "assigned" ? (
                <GradientButton
                  label="Cancel ride"
                  variant="danger"
                  onPress={handleCancel}
                  style={{ flex: 1 }}
                />
              ) : isActive ? (
                <View style={styles.ongoingNote}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={colors.accentDeep}
                  />
                  <Text style={styles.ongoingNoteText}>
                    Trip in progress — sit tight
                  </Text>
                </View>
              ) : (
                <GradientButton
                  label="Back to home"
                  onPress={goHome}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Row({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && { paddingBottom: 0 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22, paddingTop: 8 },

  // Matching state
  matchingContainer: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
  },
  matchingFooter: { gap: 16 },
  miniRoute: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    ...shadows.soft,
  },
  miniRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  miniDot: { width: 10, height: 10, borderRadius: 999, marginRight: 6 },
  miniLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  miniText: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "700" },

  // Stepper
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 14,
    ...shadows.soft,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },

  // Result (completed / cancelled)
  resultCard: { alignItems: "center", paddingVertical: 28 },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  resultSub: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 6,
  },
  fareSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginTop: 22,
  },
  fareSummaryLabel: { color: colors.inkMuted, fontSize: 13, fontWeight: "700" },
  fareSummaryValue: { color: colors.ink, fontSize: 20, fontWeight: "800" },

  driverRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  driverName: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  driverMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  driverPlate: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ratingText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 2,
  },

  row: { paddingVertical: 14 },
  rowLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  rowValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  divider: { height: 1, backgroundColor: colors.borderSoft },

  otpCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    padding: 18,
    marginTop: 14,
  },
  otpTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  otpValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    marginTop: 10,
    letterSpacing: 6,
  },
  otpHelp: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  secondaryText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 4,
  },
  ongoingNote: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingVertical: 16,
  },
  ongoingNoteText: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 4,
  },
});
