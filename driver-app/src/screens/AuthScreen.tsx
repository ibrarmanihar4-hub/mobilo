import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { colors, radii } from "../theme";

export default function AuthScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setError(null);
    setBusy(true);
    try {
      await sendOtp(phone);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(phone, otp);
      // Auth state change navigates away automatically.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Incorrect OTP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.container}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="car-sport" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.brand}>Mobilo Driver</Text>
          </View>

          <Text style={styles.title}>
            {step === "phone" ? "Sign in to drive" : "Enter the code"}
          </Text>
          <Text style={styles.sub}>
            {step === "phone"
              ? "We'll text you a one-time code."
              : `Sent to +91 ${phone.replace(/\D/g, "").slice(-10)}`}
          </Text>

          {step === "phone" ? (
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="number-pad"
                placeholder="10-digit mobile"
                placeholderTextColor={colors.inkFaint}
                style={styles.input}
                maxLength={10}
              />
            </View>
          ) : (
            <TextInput
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              placeholder="••••••"
              placeholderTextColor={colors.inkFaint}
              style={styles.otpInput}
              maxLength={6}
              textAlign="center"
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.cta}
            onPress={step === "phone" ? handleSend : handleVerify}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaText}>
                {step === "phone" ? "Send code" : "Verify & continue"}
              </Text>
            )}
          </TouchableOpacity>

          {step === "otp" ? (
            <TouchableOpacity onPress={() => setStep("phone")}>
              <Text style={styles.link}>Change number</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  brand: { fontSize: 20, fontWeight: "800", color: colors.ink },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 6, marginBottom: 24 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  prefix: { fontSize: 16, fontWeight: "800", color: colors.ink, marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    paddingVertical: 16,
  },
  otpInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 12,
  },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 12 },
  cta: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 20,
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  link: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 18,
  },
});
