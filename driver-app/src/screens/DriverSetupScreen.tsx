import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { upsertDriver } from "../services/driverRepo";
import type { RideType } from "../types";
import { colors, radii } from "../theme";

const RIDE_TYPES: Array<{ id: RideType; label: string }> = [
  { id: "cab", label: "Cab" },
  { id: "auto", label: "Auto" },
  { id: "moto", label: "Moto" },
];

export default function DriverSetupScreen({
  onDone,
}: {
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [rideType, setRideType] = useState<RideType>("cab");
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    fullName.trim().length > 1 &&
    vehicleLabel.trim().length > 1 &&
    vehiclePlate.trim().length > 3;

  const handleSave = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    const result = await upsertDriver({
      fullName: fullName.trim(),
      phone: phone.trim() || null,
      rideType,
      vehicleLabel: vehicleLabel.trim(),
      vehiclePlate: vehiclePlate.trim().toUpperCase(),
    });
    setBusy(false);
    if (result) onDone();
    else setError("Could not save your details. Try again.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Set up your driver profile</Text>
        <Text style={styles.sub}>Riders see this when you accept a trip.</Text>

        <Field label="Full name" value={fullName} onChange={setFullName} placeholder="e.g. Arjun Sharma" />
        <Field label="Phone (optional)" value={phone} onChange={setPhone} placeholder="10-digit mobile" keyboard="number-pad" />

        <Text style={styles.label}>Vehicle type</Text>
        <View style={styles.chipRow}>
          {RIDE_TYPES.map((t) => {
            const active = rideType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setRideType(t.id)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Field label="Vehicle model" value={vehicleLabel} onChange={setVehicleLabel} placeholder="e.g. Hyundai Aura" />
        <Field label="Number plate" value={vehiclePlate} onChange={setVehiclePlate} placeholder="e.g. MH 09 AB 1234" />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.cta, !valid && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!valid || busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaText}>Start driving</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboard?: "default" | "number-pad";
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        keyboardType={keyboard ?? "default"}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink, marginTop: 8 },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 6 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  chipRow: { flexDirection: "row", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontWeight: "800", fontSize: 13 },
  chipTextActive: { color: "#FFFFFF" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 14 },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 28,
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
});
