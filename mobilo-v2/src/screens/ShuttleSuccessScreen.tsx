import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import GradientButton from "../components/GradientButton";

import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radii, shadows } from "../theme/theme";
import { useBookingHistory } from "../context/BookingHistoryContext";

type ShuttleSuccessRouteProp = RouteProp<RootStackParamList, "ShuttleSuccess">;

function formatCountdown(ms: number) {
  if (ms <= 0) return "Boarding now";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    return `${h}h ${mins % 60}m`;
  }
  if (mins > 0) return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  return `${secs}s`;
}

const methodLabels: Record<string, string> = {
  upi: "UPI",
  card: "Card",
  wallet: "Wallet",
  cash: "Cash on board",
};

export default function ShuttleSuccessScreen() {
  const route = useRoute<ShuttleSuccessRouteProp>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { addBooking } = useBookingHistory();

  const {
    bookingCode,
    seatNumbers,
    departureTime,
    pickupNode,
    dropNode,
    routePlan,
    fare,
    paymentMethod,
    paymentReference,
  } = route.params;

  const [now, setNow] = useState(Date.now());
  const departureEpoch = useRef<number>(buildDepartureEpoch(departureTime))
    .current;
  const recorded = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (recorded.current) return;
    addBooking({
      bookingCode,
      rideType: "shuttle",
      title: "Smart Shuttle",
      route: `${pickupNode.stop.name} → ${dropNode.name}`,
      time: `Today · ${departureTime}`,
      fare: `₹${fare}`,
      status: "Completed",
      icon: "bus-clock",
      accent: colors.accent,
    });
    recorded.current = true;
  }, [
    addBooking,
    bookingCode,
    departureTime,
    dropNode.name,
    fare,
    pickupNode.stop.name,
  ]);

  const remaining = departureEpoch - now;
  const countdown = formatCountdown(remaining);
  const pickupLat = pickupNode.stop.latitude;
  const pickupLng = pickupNode.stop.longitude;
  const pickupDistanceMeters = Math.round(pickupNode.distance);
  const pickupWalkTime = pickupNode.walkMinutes;

  const openWalkNavigation = () => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${pickupLat},${pickupLng}&dirflg=w`,
      android: `google.navigation:q=${pickupLat},${pickupLng}&mode=w`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}&travelmode=walking`,
    })!;
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/dir/?api=1&destination=${pickupLat},${pickupLng}&travelmode=walking`
      );
    });
  };

  const goHome = () => {
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 20,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.successHead}>
            <View style={styles.successDot}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Booking confirmed</Text>
            <Text style={styles.successSub}>
              Walk to your boarding junction and we'll see you on board.
            </Text>
          </View>

          {/* Boarding details */}
          <View style={styles.card}>
            <View style={styles.countdownRow}>
              <View>
                <Text style={styles.eyebrow}>BOARDING IN</Text>
                <Text style={styles.countdown}>{countdown}</Text>
              </View>
              <View style={styles.codePill}>
                <Text style={styles.codePillText}>{bookingCode}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.routeRow}>
              <View style={styles.routeCol}>
                <Text style={styles.routeLabel}>FROM</Text>
                <Text style={styles.routeValue} numberOfLines={2}>
                  {pickupNode.stop.name}
                </Text>
              </View>
              <View style={styles.arrow}>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={colors.ink}
                />
              </View>
              <View style={[styles.routeCol, { alignItems: "flex-end" }]}>
                <Text style={styles.routeLabel}>TO</Text>
                <Text
                  style={[styles.routeValue, { textAlign: "right" }]}
                  numberOfLines={2}
                >
                  {dropNode.name}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.stubsRow}>
              <Stub label="Departure" value={departureTime} />
              <Stub
                label={seatNumbers.length > 1 ? "Seats" : "Seat"}
                value={seatNumbers.join(", ")}
              />
              <Stub label="Fare" value={`₹${fare}`} />
            </View>
          </View>

          {/* Payment + walk */}
          <View style={styles.card}>
            <Row
              icon="card-outline"
              label="Payment"
              value={`${methodLabels[paymentMethod] || "Paid"} · ${paymentReference}`}
            />
            <View style={styles.divider} />
            <Row
              icon="walk-outline"
              label="Walk to pickup"
              value={`${pickupDistanceMeters} m · ${pickupWalkTime} min`}
            />
            <View style={styles.divider} />
            <Row
              icon="git-branch-outline"
              label="Route"
              value={routePlan.route.name}
              last
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <GradientButton
              label="Navigate to pickup"
              icon="navigate"
              onPress={openWalkNavigation}
            />
            <TouchableOpacity onPress={goHome} style={styles.ghost}>
              <Text style={styles.ghostText}>Back to home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function buildDepartureEpoch(time: string): number {
  const today = new Date().toDateString();
  const parsed = new Date(`${today} ${time}`);
  if (Number.isNaN(parsed.getTime())) {
    return Date.now() + 5 * 60 * 1000;
  }
  return parsed.getTime();
}

function Stub({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stub}>
      <Text style={styles.stubLabel}>{label}</Text>
      <Text style={styles.stubValue}>{value}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={colors.ink} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    flexGrow: 1,
  },
  successHead: {
    alignItems: "center",
    marginBottom: 22,
  },
  successDot: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    ...shadows.card,
  },
  successTitle: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  successSub: {
    color: colors.inkMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 20,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    ...shadows.soft,
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  eyebrow: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  countdown: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 2,
  },
  codePill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codePillText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 14,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeCol: { flex: 1 },
  routeLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  routeValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  stubsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stub: { flex: 1 },
  stubLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  stubValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  rowValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  actions: {
    marginTop: 6,
    gap: 8,
  },
  ghost: {
    alignItems: "center",
    paddingVertical: 14,
  },
  ghostText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
