import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import BrandMark from "../components/BrandMark";
import GradientButton from "../components/GradientButton";
import GlassCard from "../components/GlassCard";
import ScreenBackground from "../components/ScreenBackground";

import { useAuth } from "../context/AuthContext";
import { AuthMode } from "../types/auth";
import { colors, radii } from "../theme/theme";
import { getLayoutMetrics } from "../utils/responsive";

const RESEND_COOLDOWN_SECONDS = 30;

export default function AuthScreen() {
  const { sendOtp, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [otpSent, setOtpSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const requiresFullName = mode === "signUp";

  const canSendOtp = useMemo(() => {
    const hasPhone = phoneNumber.replace(/\D/g, "").length >= 10;
    if (!requiresFullName) return hasPhone;
    return hasPhone && fullName.trim().length >= 2;
  }, [fullName, phoneNumber, requiresFullName]);

  const canVerify = canSendOtp && otp.replace(/\D/g, "").length >= 4;

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(
      () => setResendIn((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(id);
  }, [resendIn]);

  const previewPhone = useMemo(() => {
    const digits = phoneNumber.replace(/\D/g, "").slice(-10);
    if (digits.length < 10) return phoneNumber;
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }, [phoneNumber]);

  const resetOtpStep = () => {
    setOtpSent(false);
    setOtp("");
    setSessionId("");
    setInfo(null);
    setErrorMessage(null);
    setResendIn(0);
  };

  const handleModeChange = (next: AuthMode) => {
    if (next === mode) return;
    setMode(next);
    resetOtpStep();
  };

  const handleSendOtp = async () => {
    if (!canSendOtp || submitting || resendIn > 0) return;
    setSubmitting(true);
    setErrorMessage(null);
    setInfo(null);
    try {
      const result = await sendOtp({
        mode,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setSessionId(result.sessionId);
      setOtpSent(true);
      setInfo(result.message);
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Could not send OTP."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!canVerify || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setInfo(null);
    try {
      await verifyOtp({
        mode,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        otp: otp.trim(),
        sessionId,
      });
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Could not verify OTP."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scroll,
              {
                paddingTop: insets.top + 24,
                paddingBottom: insets.bottom + 24,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.container,
                {
                  maxWidth: layout.contentMaxWidth,
                  width: "100%",
                  alignSelf: "center",
                },
              ]}
            >
              <BrandMark size="lg" />

              <Text style={styles.title}>
                {mode === "signIn"
                  ? "Welcome back."
                  : "Create your account."}
              </Text>
              <Text style={styles.subtitle}>
                {mode === "signIn"
                  ? "Enter your phone to continue."
                  : "Sign up in 30 seconds with your phone."}
              </Text>

              {/* Segmented mode toggle */}
              <View style={styles.segment}>
                {(["signIn", "signUp"] as AuthMode[]).map((m) => {
                  const isActive = m === mode;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.segmentItem,
                        isActive && styles.segmentItemActive,
                      ]}
                      onPress={() => handleModeChange(m)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          isActive && styles.segmentTextActive,
                        ]}
                      >
                        {m === "signIn" ? "Sign in" : "Create account"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Form */}
              <GlassCard padding={20} style={{ marginTop: 16 }}>
                {requiresFullName ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full name</Text>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Your name"
                      placeholderTextColor={colors.inkFaint}
                      autoCapitalize="words"
                      style={styles.input}
                      editable={!submitting && !otpSent}
                    />
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mobile number</Text>
                  <View
                    style={[
                      styles.phoneRow,
                      otpSent && styles.phoneRowLocked,
                    ]}
                  >
                    <View style={styles.countryPill}>
                      <Text style={styles.countryText}>+91</Text>
                    </View>
                    <TextInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="98765 43210"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      style={styles.phoneInput}
                      editable={!otpSent && !submitting}
                    />
                  </View>
                  <Text style={styles.helper}>
                    We'll text a verification code via SMS.
                  </Text>
                </View>

                {otpSent ? (
                  <View style={styles.otpCard}>
                    <View style={styles.otpHead}>
                      <View>
                        <Text style={styles.otpLabel}>SENT TO</Text>
                        <Text style={styles.otpPhone}>{previewPhone}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={resetOtpStep}
                        disabled={submitting}
                      >
                        <Text style={styles.changeLink}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.label, { marginTop: 12 }]}>
                      Enter OTP
                    </Text>
                    <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="6-digit code"
                      placeholderTextColor={colors.inkFaint}
                      keyboardType="number-pad"
                      autoComplete="sms-otp"
                      maxLength={6}
                      style={[styles.input, styles.otpInput]}
                      editable={!submitting}
                    />
                    <View style={styles.resendRow}>
                      <Text style={styles.resendText}>
                        {resendIn > 0
                          ? `Resend in ${resendIn}s`
                          : "Didn't get the code?"}
                      </Text>
                      <TouchableOpacity
                        disabled={submitting || resendIn > 0}
                        onPress={handleSendOtp}
                      >
                        <Text
                          style={[
                            styles.resendLink,
                            (submitting || resendIn > 0) && {
                              opacity: 0.4,
                            },
                          ]}
                        >
                          Resend code
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {info ? (
                  <View style={styles.infoBanner}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.accent}
                    />
                    <Text style={styles.infoText}>{info}</Text>
                  </View>
                ) : null}

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Ionicons
                      name="alert-circle"
                      size={16}
                      color={colors.danger}
                    />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {!otpSent ? (
                  <GradientButton
                    label={mode === "signIn" ? "Continue" : "Send code"}
                    icon="arrow-forward"
                    loading={submitting}
                    disabled={!canSendOtp}
                    onPress={handleSendOtp}
                    style={{ marginTop: 8 }}
                  />
                ) : (
                  <GradientButton
                    label={
                      mode === "signIn"
                        ? "Sign in"
                        : "Verify & create account"
                    }
                    icon="checkmark"
                    loading={submitting}
                    disabled={!canVerify}
                    onPress={handleVerifyOtp}
                    style={{ marginTop: 8 }}
                  />
                )}
              </GlassCard>

              <View style={styles.footerRow}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={colors.inkMuted}
                />
                <Text style={styles.footer}>
                  Secured by SMS verification
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
  },
  container: {},
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 36,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    padding: 4,
    marginTop: 24,
  },
  segmentItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: colors.ink,
  },
  inputGroup: { marginBottom: 14 },
  label: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  otpInput: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 8,
    textAlign: "center",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  phoneRowLocked: {
    backgroundColor: colors.surfaceMuted,
  },
  countryPill: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surfaceMuted,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  countryText: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 15,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "600",
  },
  helper: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 8,
  },
  otpCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 14,
  },
  otpHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  otpLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  otpPhone: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  changeLink: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  resendText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  resendLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    color: colors.accentDeep,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 18,
  },
  footer: {
    color: colors.inkMuted,
    fontSize: 12,
    textAlign: "center",
    marginLeft: 4,
    fontWeight: "600",
  },
});
