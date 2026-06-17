import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";
import RouteMap, { RouteMapStop } from "../components/RouteMap";

import {
  DirectRideId,
  formatCurrency,
  rideConfigs,
} from "../constants/rideCatalog";
import { RootStackParamList } from "../navigation/RootNavigator";
import { haversineDistance } from "../utils/haversine";
import { colors, radii, shadows } from "../theme/theme";
import { getLayoutMetrics } from "../utils/responsive";

type DirectRideBookingRouteProp = RouteProp<
  RootStackParamList,
  "DirectRideBooking"
>;

const ridePreferences: Record<
  DirectRideId,
  Array<{ id: string; label: string }>
> = {
  cab: [
    { id: "quiet", label: "Quiet ride" },
    { id: "ac", label: "Cool AC" },
    { id: "call", label: "Call on arrival" },
  ],
  auto: [
    { id: "call", label: "Call on arrival" },
    { id: "shortcut", label: "Quickest route" },
    { id: "cash", label: "Exact cash ready" },
  ],
  moto: [
    { id: "helmet", label: "Helmet ready" },
    { id: "call", label: "Call on arrival" },
    { id: "fast", label: "Fastest pickup" },
  ],
};

const perKmRate: Record<DirectRideId, number> = { cab: 15, auto: 9, moto: 6 };
const bookingFee: Record<DirectRideId, number> = { cab: 18, auto: 12, moto: 8 };

export default function DirectRideBookingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DirectRideBookingRouteProp>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);

  const { selectedRide, sourceLocation, destinationLocation } = route.params;
  const ride = rideConfigs[selectedRide];

  const [selectedPreference, setSelectedPreference] = useState<string | null>(
    ridePreferences[selectedRide][0]?.id ?? null
  );

  const directDistanceMeters = haversineDistance(
    sourceLocation.lat,
    sourceLocation.lng,
    destinationLocation.lat,
    destinationLocation.lng
  );
  const routeDistanceKm = Math.max(1, directDistanceMeters / 1000);
  const variableFare = Math.round(routeDistanceKm * perKmRate[selectedRide]);
  const totalFare =
    ride.baseFare + variableFare + bookingFee[selectedRide];
  const mapHeight = layout.isTablet
    ? Math.min(Math.max(height * 0.3, 260), 340)
    : Math.min(Math.max(height * 0.26, 220), 280);

  const mapStops: RouteMapStop[] = [
    {
      id: sourceLocation.id,
      name: sourceLocation.isCurrentLocation
        ? "Current location"
        : sourceLocation.name,
      latitude: sourceLocation.lat,
      longitude: sourceLocation.lng,
      highlight: "source",
    },
    {
      id: destinationLocation.id,
      name: destinationLocation.name,
      latitude: destinationLocation.lat,
      longitude: destinationLocation.lng,
      highlight: "dest",
    },
  ];

  const proceedToPayment = () => {
    const bookingCode = `MB${Math.floor(1000 + Math.random() * 9000)}`;
    navigation.navigate("Payment", {
      intent: {
        kind: "direct",
        selectedRide,
        sourceLocation,
        destinationLocation,
        fare: totalFare,
        bookingCode,
        etaMinutes: ride.etaMinutes,
      },
    });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          step={3}
          title="Review booking"
          subtitle={`${ride.title} · ${ride.serviceTag}`}
        />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.content,
              {
                maxWidth: layout.contentMaxWidth,
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            <RouteMap
              stops={mapStops}
              polylineStops={mapStops}
              height={mapHeight}
              badge={`${routeDistanceKm.toFixed(1)} km`}
            />

            <View style={styles.rideRow}>
              <View style={styles.rideIcon}>
                <MaterialCommunityIcons
                  name={ride.icon}
                  size={22}
                  color={colors.ink}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rideTitle}>{ride.title}</Text>
                <Text style={styles.rideSub}>
                  {ride.serviceTag} · {ride.capacity}
                </Text>
              </View>
              <View style={styles.arrivalPill}>
                <Text style={styles.arrivalText}>{ride.etaMinutes} min</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ride preference</Text>
              <View style={styles.prefRow}>
                {ridePreferences[selectedRide].map((preference) => {
                  const isSelected = selectedPreference === preference.id;
                  return (
                    <TouchableOpacity
                      key={preference.id}
                      onPress={() => setSelectedPreference(preference.id)}
                      activeOpacity={0.85}
                      style={[
                        styles.prefChip,
                        isSelected && styles.prefChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.prefText,
                          isSelected && styles.prefTextSelected,
                        ]}
                      >
                        {preference.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.fareHead}>
                <Text style={styles.sectionTitle}>Fare estimate</Text>
                <Text style={styles.distanceText}>
                  {routeDistanceKm.toFixed(1)} km
                </Text>
              </View>
              <FareRow label="Base fare" value={formatCurrency(ride.baseFare)} />
              <FareRow
                label="Distance charge"
                value={formatCurrency(variableFare)}
              />
              <FareRow
                label="Booking fee"
                value={formatCurrency(bookingFee[selectedRide])}
              />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Estimated total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(totalFare)}
                </Text>
              </View>
              <Text style={styles.helperText}>
                Taxes and promo applied at payment.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.cta,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View>
            <Text style={styles.ctaLabel}>ESTIMATE</Text>
            <Text style={styles.ctaFare}>{formatCurrency(totalFare)}</Text>
          </View>
          <GradientButton
            label="Continue to payment"
            icon="arrow-forward"
            onPress={proceedToPayment}
            style={{ flex: 1, marginLeft: 16 }}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function FareRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fareRow}>
      <Text style={styles.fareLabel}>{label}</Text>
      <Text style={styles.fareValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  rideRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  rideIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rideTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  rideSub: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  arrivalPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  arrivalText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 14,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 12,
  },
  prefRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prefChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  prefChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  prefText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  prefTextSelected: { color: "#FFFFFF" },
  fareHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  distanceText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  fareLabel: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  fareValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  totalLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  totalValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  helperText: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 8,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  ctaLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  ctaFare: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
});
