/**
 * KYC Step 2 — Aadhaar Verification
 * Uber/Ola style. Local state only. No Supabase.
 * Navigation: prop-based (onNext / onBack).
 */

import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AadhaarData {
  aadhaarNumber: string;
  frontImage: string | null;
  backImage: string | null;
}

interface Props {
  onNext: (data: AadhaarData) => void;
  onBack: () => void;
  initialData?: Partial<AadhaarData>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 9;
const CURRENT_STEP = 2;

// ─── Image Picker helper ──────────────────────────────────────────────────────

async function pickFromGallery(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IP = require("expo-image-picker");
    if (Platform.OS !== "web") {
      const { status } = await IP.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo access to upload documents.");
        return null;
      }
    }
    const res = await IP.launchImageLibraryAsync({
      mediaTypes: IP.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return null;
    return res.assets[0].uri;
  } catch {
    Alert.alert("Unavailable", "Image picker is not available on this device.");
    return null;
  }
}

async function pickFromCamera(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IP = require("expo-image-picker");
    if (Platform.OS !== "web") {
      const { status } = await IP.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow camera access to capture documents.");
        return null;
      }
    }
    const res = await IP.launchCameraAsync({
      allowsEditing: true,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return null;
    return res.assets[0].uri;
  } catch {
    Alert.alert("Unavailable", "Camera is not available on this device.");
    return null;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AadhaarScreen({ onNext, onBack, initialData }: Props) {
  const [aadhaarNumber, setAadhaarNumber] = useState(initialData?.aadhaarNumber ?? "");
  const [frontImage, setFrontImage] = useState<string | null>(initialData?.frontImage ?? null);
  const [backImage, setBackImage] = useState<string | null>(initialData?.backImage ?? null);
  const [loadingFront, setLoadingFront] = useState(false);
  const [loadingBack, setLoadingBack] = useState(false);
  const [touched, setTouched] = useState(false);

  // Format aadhaar as XXXX XXXX XXXX while storing raw 12 digits
  const rawDigits = aadhaarNumber.replace(/\D/g, "").slice(0, 12);
  const formatted = rawDigits.replace(/(\d{4})(?=\d)/g, "$1 ");

  const errors = {
    aadhaarNumber: touched && rawDigits.length !== 12 ? "Aadhaar must be exactly 12 digits" : "",
    frontImage: touched && !frontImage ? "Front side of Aadhaar is required" : "",
    backImage: touched && !backImage ? "Back side of Aadhaar is required" : "",
  };

  const isValid = rawDigits.length === 12 && !!frontImage && !!backImage;

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    onNext({ aadhaarNumber: rawDigits, frontImage, backImage });
  };

  const showPickerOptions = (onPicked: (uri: string) => void) => {
    if (Platform.OS === "web") {
      pickFromGallery().then((u) => { if (u) onPicked(u); });
      return;
    }
    Alert.alert("Upload Document", "Choose a source", [
      { text: "Camera", onPress: async () => { const u = await pickFromCamera(); if (u) onPicked(u); } },
      { text: "Gallery", onPress: async () => { const u = await pickFromGallery(); if (u) onPicked(u); } },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handlePickFront = () => {
    setLoadingFront(true);
    showPickerOptions((uri) => { setFrontImage(uri); setLoadingFront(false); });
    // reset loading if cancelled (alert dismissed without picking)
    setTimeout(() => setLoadingFront(false), 30000);
  };

  const handlePickBack = () => {
    setLoadingBack(true);
    showPickerOptions((uri) => { setBackImage(uri); setLoadingBack(false); });
    setTimeout(() => setLoadingBack(false), 30000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Aadhaar Verification</Text>
          <Text style={styles.headerSub}>Step {CURRENT_STEP} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="card-outline" size={30} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Aadhaar Card</Text>
              <Text style={styles.heroSub}>Upload both sides of your Aadhaar card for identity verification.</Text>
            </View>
          </View>

          {/* ── Aadhaar Number Card ── */}
          <View style={styles.card}>
            <FieldLabel label="Aadhaar Number" required />
            <TextInput
              style={[styles.input, styles.aadhaarInput, touched && errors.aadhaarNumber ? styles.inputError : null]}
              placeholder="XXXX  XXXX  XXXX"
              placeholderTextColor={colors.inkFaint}
              value={formatted}
              onChangeText={(v) => setAadhaarNumber(v.replace(/\D/g, "").slice(0, 12))}
              keyboardType="number-pad"
              maxLength={14}
            />
            {touched && errors.aadhaarNumber ? <FieldError msg={errors.aadhaarNumber} /> : null}
            {rawDigits.length > 0 && rawDigits.length < 12 ? (
              <View style={styles.digitCount}>
                <Text style={styles.digitCountText}>{rawDigits.length}/12 digits</Text>
              </View>
            ) : null}
            {rawDigits.length === 12 ? (
              <View style={styles.validBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <Text style={styles.validBadgeText}>Valid Aadhaar number</Text>
              </View>
            ) : null}
          </View>

          {/* ── Upload Cards ── */}
          <UploadCard
            label="Aadhaar Front"
            sublabel="Side showing your photo, name & Aadhaar number"
            icon="id-card-outline"
            imageUri={frontImage}
            onPress={handlePickFront}
            onRemove={() => setFrontImage(null)}
            loading={loadingFront}
            error={touched ? errors.frontImage : ""}
            required
          />

          <UploadCard
            label="Aadhaar Back"
            sublabel="Side showing your address"
            icon="map-outline"
            imageUri={backImage}
            onPress={handlePickBack}
            onRemove={() => setBackImage(null)}
            loading={loadingBack}
            error={touched ? errors.backImage : ""}
            required
          />

          {/* ── Tips ── */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={16} color={colors.warning} />
              <Text style={styles.tipsTitle}>Tips for a good scan</Text>
            </View>
            {[
              "Place card on a flat, dark surface",
              "Ensure all 4 corners are visible",
              "Avoid glare and shadows",
              "Text should be clearly readable",
            ].map((tip) => (
              <View key={tip} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {/* ── Security note ── */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
            <Text style={styles.infoText}>
              Your Aadhaar data is encrypted and used only for KYC verification.
            </Text>
          </View>

        </ScrollView>

        {/* ── Footer buttons ── */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.prevBtn} onPress={onBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color={colors.ink} />
              <Text style={styles.prevBtnText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.footerNote}>{TOTAL_STEPS - CURRENT_STEP} steps remaining</Text>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

// ─── Upload Card Component ────────────────────────────────────────────────────

interface UploadCardProps {
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageUri: string | null;
  onPress: () => void;
  onRemove: () => void;
  loading: boolean;
  error: string;
  required?: boolean;
}

function UploadCard({ label, sublabel, icon, imageUri, onPress, onRemove, loading, error, required }: UploadCardProps) {
  return (
    <View style={styles.uploadWrapper}>
      <FieldLabel label={label} required={required} />
      <Text style={styles.uploadSublabel}>{sublabel}</Text>

      {imageUri ? (
        /* ── Preview state ── */
        <View style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewOverlay}>
            <View style={styles.previewBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
              <Text style={styles.previewBadgeText}>Uploaded</Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewActionBtn} onPress={onPress} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={16} color={colors.ink} />
                <Text style={styles.previewActionText}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.previewActionBtn, styles.previewRemoveBtn]} onPress={onRemove} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.previewActionText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* ── Empty upload state ── */
        <TouchableOpacity
          style={[styles.uploadCard, error ? styles.uploadCardError : null, loading && styles.uploadCardLoading]}
          onPress={onPress}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.uploadIconCircle}>
            <Ionicons name={loading ? "hourglass-outline" : icon} size={26} color={loading ? colors.inkFaint : colors.inkMuted} />
          </View>
          <Text style={styles.uploadLabel}>{loading ? "Opening…" : "Tap to upload"}</Text>
          <Text style={styles.uploadHint}>Camera or Gallery · JPG/PNG</Text>
          <View style={styles.uploadChipRow}>
            <View style={styles.uploadChip}>
              <Ionicons name="camera" size={11} color={colors.inkMuted} />
              <Text style={styles.uploadChipText}>Camera</Text>
            </View>
            <View style={styles.uploadChip}>
              <Ionicons name="images" size={11} color={colors.inkMuted} />
              <Text style={styles.uploadChipText}>Gallery</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      {error ? <FieldError msg={error} /> : null}
    </View>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
    </Text>
  );
}

function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View style={styles.errorRow}>
      <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 999,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1, borderColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  headerSub: { fontSize: 11, color: colors.inkMuted, fontWeight: "600", marginTop: 1 },

  progressTrack: { height: 3, backgroundColor: colors.borderSoft },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 999 },

  scroll: { padding: 20, paddingBottom: 12 },

  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  heroIconWrap: {
    width: 54, height: 54, borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  heroSub: { fontSize: 13, color: colors.inkMuted, marginTop: 3, lineHeight: 18 },

  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18,
    marginBottom: 16, ...shadows.soft,
  },
  fieldLabel: {
    fontSize: 11, fontWeight: "700", color: colors.inkMuted,
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontWeight: "600", color: colors.ink,
  },
  aadhaarInput: { fontSize: 20, fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  digitCount: { alignItems: "flex-end", marginTop: 6 },
  digitCountText: { fontSize: 12, color: colors.inkMuted, fontWeight: "600" },
  validBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 8, backgroundColor: colors.accentSoft,
    borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start",
  },
  validBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },

  uploadWrapper: { marginBottom: 16 },
  uploadSublabel: { fontSize: 12, color: colors.inkFaint, fontWeight: "500", marginBottom: 10, marginTop: -4 },

  uploadCard: {
    borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
    borderRadius: radii.lg, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    paddingVertical: 28, gap: 6, ...shadows.soft,
  },
  uploadCardError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  uploadCardLoading: { opacity: 0.6 },
  uploadIconCircle: {
    width: 56, height: 56, borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  uploadLabel: { fontSize: 15, fontWeight: "700", color: colors.ink },
  uploadHint: { fontSize: 12, color: colors.inkFaint, fontWeight: "500" },
  uploadChipRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  uploadChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceMuted, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  uploadChipText: { fontSize: 11, color: colors.inkMuted, fontWeight: "600" },

  previewCard: {
    borderRadius: radii.lg, overflow: "hidden",
    borderWidth: 1, borderColor: colors.accent, ...shadows.soft,
  },
  previewImage: { width: "100%", height: 180 },
  previewOverlay: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 12, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  previewBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  previewBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  previewActions: { flexDirection: "row", gap: 8 },
  previewActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.surfaceMuted, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  previewRemoveBtn: { borderColor: colors.dangerSoft, backgroundColor: colors.dangerSoft },
  previewActionText: { fontSize: 12, fontWeight: "700", color: colors.ink },

  tipsCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 14, ...shadows.soft,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  tipsTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  tipDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.accent },
  tipText: { fontSize: 13, color: colors.inkMuted, fontWeight: "500" },

  infoBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.accentSoft, borderRadius: radii.md,
    padding: 12, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "600", lineHeight: 17 },

  footer: {
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft, gap: 8,
  },
  footerRow: { flexDirection: "row", gap: 12 },
  prevBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, paddingVertical: 15,
  },
  prevBtnText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  nextBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.ink, borderRadius: radii.md, paddingVertical: 15,
    ...shadows.soft,
  },
  nextBtnDisabled: { backgroundColor: colors.inkFaint, opacity: 0.5 },
  nextBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  footerNote: { textAlign: "center", fontSize: 12, color: colors.inkFaint, fontWeight: "500" },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
