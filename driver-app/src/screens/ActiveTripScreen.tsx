import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import TripMap, { MapPoint } from "../components/TripMap";
import { useLocationBroadcast } from "../hooks/useLocationBroadcast";
import {
  advanceTrip,
  cancelTripByDriver,
  subscribeToTrip,
} from "../services/driverRepo";
import type { TripRow, TripStatus } from "../types";
import { colors, radii, shadows } from "../theme";

// What each status' primary action does next.
const NEXT: Partial<Record<TripStatus, { label: string; to: TripStatus }>> = {
  assigned: { label: "I've arrived at pickup", to: "arriving" },
  arriving: { label: "Start trip (verify OTP)", to: "ongoing" },
  ongoing: { label: "Complete trip", to: "completed" },
};

export default function ActiveTripScreen({
  trip: initialTrip,
  onDone,
}: {
  trip: TripRow;
  onDone: () => void;
}) {
  const [trip, setTrip] = useState<TripRow>(initialTrip);
  const [otpInput, setOtpInput] = useState("");

  // Keep broadcasting location for the whole active trip. Passing the trip id
  // opens the per-trip Realtime channel the rider listens on.
  useLocationBroadcast(true, trip.id);

  // Watch for rider-side cancellations.
  useEffect(() => {
    const unsub = subscribeToTrip(trip.id, (t) => {
      setTrip(t);
      if (t.status === "cancelled") {
        Alert.alert("Trip cancelled", "The rider cancelled this trip.");
        onDone();
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const points: MapPoint[] = [
    {
      id: "pickup",
      latitude: trip.pickup_lat,
      longitude: trip.pickup_lng,
      kind: "pickup",
    },
    {
      id: "drop",
      latitude: trip.drop_lat,
      longitude: trip.drop_lng,
      kind: "drop",
    },
  ];

  const next = NEXT[trip.status];

  const handleAdvance = async () => {
    if (!next) return;

    // Before starting the ride, verify the rider's pickup OTP.
    if (trip.status === "arriving") {
      if (otpInput.replace(/\D/g, "") !== trip.otp) {
        Alert.alert("Wrong OTP", "Ask the rider for the correct pickup OTP.");
        return;
      }
    }

    await advanceTrip(trip.id, next.to);
    setTrip((cur) => ({ ...cur, status: next.to }));

    if (next.to === "completed") {
      Alert.alert("Trip completed", `You earned ₹${trip.fare}.`);
      onDone();
    }
  };

  const handleCancel = () => {
    Alert.alert("Cancel trip?", "This will release the ride.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Cancel ride",
        style: "destructive",
        onPress: async () => {
          await cancelTripByDriver(trip.id);
          onDone();
        },
      },
    ]);
  };

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${
    trip.status === "ongoing" ? trip.drop_lat : trip.pickup_lat
  },${trip.status === "ongoing" ? trip.drop_lng : trip.pickup_lng}&travelmode=driving`;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TripMap points={points} height={260} style={{ marginBottom: 16 }} />

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{labelFor(trip.status)}</Text>
        </View>

        <View style={styles.card}>
          <Row label="Booking" value={trip.booking_code} />
          <Divider />
          <Row label="Pickup" value={trip.pickup_name} />
          <Divider />
          <Row label="Drop" value={trip.drop_name} />
          <Divider />
          <Row label="Fare" value={`₹${trip.fare}`} last />
        </View>

        <TouchableOpacity
          style={styles.nav}
          onPress={() => Linking.openURL(navUrl)}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={16} color={colors.ink} />
          <Text style={styles.navText}>
            Navigate to {trip.status === "ongoing" ? "drop" : "pickup"}
          </Text>
        </TouchableOpacity>

        {trip.status === "arriving" ? (
          <View style={styles.otpBox}>
            <Text style={styles.otpLabel}>Enter rider's pickup OTP</Text>
            <TextInput
              value={otpInput}
              onChangeText={setOtpInput}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="4-digit"
              placeholderTextColor={colors.inkFaint}
              style={styles.otpInput}
            />
          </View>
        ) : null}

        {next ? (
          <TouchableOpacity
            style={styles.primary}
            onPress={handleAdvance}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>{next.label}</Text>
          </TouchableOpacity>
        ) : null}

        {trip.status !== "ongoing" ? (
          <TouchableOpacity onPress={handleCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel trip</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function labelFor(s: TripStatus): string {
  switch (s) {
    case "assigned":
      return "Head to pickup";
    case "arriving":
      return "At pickup — verify OTP";
    case "ongoing":
      return "Trip in progress";
    default:
      return s;
  }
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
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, paddingBottom: 40 },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    ...shadows.soft,
  },
  row: { paddingVertical: 12 },
  rowLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  rowValue: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.borderSoft },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    marginTop: 14,
  },
  navText: { color: colors.ink, fontSize: 14, fontWeight: "800", marginLeft: 6 },
  otpBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 14,
  },
  otpLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  otpInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 8,
    textAlign: "center",
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 18,
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  cancel: { alignItems: "center", paddingVertical: 16, marginTop: 4 },
  cancelText: { color: colors.danger, fontSize: 14, fontWeight: "800" },
});
