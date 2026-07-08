/**
 * KYC Step 3 — PAN Card Verification
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

export interface PanData {
  panNumber: string;
  panImage: string | null;
}

interface Props {
  onNext: (data: PanData) => void;
  onBack: () => void;
  initialData?: Partial<PanData>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 9;
const CURRENT_STEP = 3;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// ─── Image Picker helpers ─────────────────────────────────────────────────────

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
    const res = await IP.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
    if (res.canceled || !res.assets?.length) return null;
    return res.assets[0].uri;
  } catch {
    Alert.alert("Unavailable", "Camera is not available on this device.");
    return null;
  }
}

function showPickerOptions(onPicked: (uri: string) => void) {
  if (Platform.OS === "web") {
    pickFromGallery().then((u) => { if (u) onPicked(u); });
    return;
  }
  Alert.alert("Upload Document", "Choose a source", [
    {
      text: "Camera",
      onPress: async () => {
        const u = await pickFromCamera();
        if (u) onPicked(u);
      },
    },
    {
      text: "Gallery",
      onPress: async () => {
        const u = await pickFromGallery();
        if (u) onPicked(u);
      },
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PanScreen({ onNext, onBack, initialData }: Props) {
  const [panNumber, setPanNumber] = useState(initialData?.panNumber ?? "");
  const [panImage, setPanImage] = useState<string | null>(initialData?.panImage ?? null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const panUpper = panNumber.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const isPanValid = PAN_REGEX.test(panUpper);

  // live format hint: highlight each segment as user types
  const panSegments = getPanSegments(panUpper);

  const errors = {
    panNumber: touched && !isPanValid
      ? panUpper.length === 0
        ? "PAN number is required"
        : "Invalid PAN format — must be like ABCDE1234F"
      : "",
    panImage: touched && !panImage ? "PAN card image is required" : "",
  };

  const isValid = isPanValid && !!panImage;

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    onNext({ panNumber: panUpper, panImage });
  };

  const handlePickImage = () => {
    setLoading(true);
    showPickerOptions((uri) => {
      setPanImage(uri);
      setLoading(false);
    });
    setTimeout(() => setLoading(false), 30000);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>PAN Verification</Text>
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
              <Ionicons name="document-text-outline" size={30} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>PAN Card</Text>
              <Text style={styles.heroSub}>
                Required for tax compliance and earnings settlement.
              </Text>
            </View>
          </View>

          {/* ── PAN Number Card ── */}
          <View style={styles.card}>
            <FieldLabel label="PAN Number" required />
            <TextInput
              style={[
                styles.input,
                styles.panInput,
                touched && errors.panNumber ? styles.inputError : null,
                isPanValid ? styles.inputValid : null,
              ]}
              placeholder="ABCDE1234F"
              placeholderTextColor={colors.inkFaint}
              value={panUpper}
              onChangeText={(v) => setPanNumber(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
              autoCapitalize="characters"
              maxLength={10}
              returnKeyType="done"
            />
            {touched && errors.panNumber ? <FieldError msg={errors.panNumber} /> : null}

            {/* Format guide */}
            <View style={styles.panFormatRow}>
              <PanSegment label={panSegments.letters1} hint="5 Letters" done={panSegments.letters1Done} />
              <View style={styles.panSep} />
              <PanSegment label={panSegments.digits} hint="4 Digits" done={panSegments.digitsDone} />
              <View style={styles.panSep} />
              <PanSegment label={panSegments.letter2} hint="1 Letter" done={panSegments.letter2Done} />
            </View>

            {isPanValid ? (
              <View style={styles.validBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                <Text style={styles.validBadgeText}>Valid PAN format</Text>
              </View>
            ) : null}
          </View>

          {/* ── Upload Card ── */}
          <View style={styles.uploadWrapper}>
            <FieldLabel label="PAN Card Image" required />
            <Text style={styles.uploadSublabel}>Upload a clear photo of your PAN card</Text>

            {panImage ? (
              <View style={styles.previewCard}>
                <Image source={{ uri: panImage }} style={styles.previewImage} resizeMode="cover" />
                {/* Document overlay hint */}
                <View style={styles.previewCornerTL} />
                <View style={styles.previewCornerTR} />
                <View style={styles.previewCornerBL} />
                <View style={styles.previewCornerBR} />
                <View style={styles.previewOverlay}>
                  <View style={styles.previewBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                    <Text style={styles.previewBadgeText}>Uploaded</Text>
                  </View>
                  <View style={styles.previewActions}>
                    <TouchableOpacity style={styles.previewBtn} onPress={handlePickImage} activeOpacity={0.8}>
                      <Ionicons name="camera-outline" size={15} color={colors.ink} />
                      <Text style={styles.previewBtnText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.previewBtn, styles.previewBtnDanger]}
                      onPress={() => setPanImage(null)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.danger} />
                      <Text style={[styles.previewBtnText, { color: colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadCard, touched && errors.panImage ? styles.uploadCardError : null, loading ? styles.uploadCardLoading : null]}
                onPress={handlePickImage}
                disabled={loading}
                activeOpacity={0.8}
              >
                <View style={styles.uploadIconRing}>
                  <Ionicons name={loading ? "hourglass-outline" : "cloud-upload-outline"} size={30} color={loading ? colors.inkFaint : colors.inkMuted} />
                </View>
                <Text style={styles.uploadTitle}>{loading ? "Opening…" : "Upload PAN Card"}</Text>
                <Text style={styles.uploadSubtitle}>JPG or PNG · Max 5 MB</Text>
                <View style={styles.uploadMethodRow}>
                  <View style={styles.methodChip}>
                    <Ionicons name="camera" size={12} color={colors.inkMuted} />
                    <Text style={styles.methodChipText}>Camera</Text>
                  </View>
                  <View style={styles.methodDot} />
                  <View style={styles.methodChip}>
                    <Ionicons name="images-outline" size={12} color={colors.inkMuted} />
                    <Text style={styles.methodChipText}>Gallery</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            {touched && errors.panImage ? <FieldError msg={errors.panImage} /> : null}
          </View>

          {/* ── What to check ── */}
          <View style={styles.checklistCard}>
            <View style={styles.checklistHeader}>
              <Ionicons name="eye-outline" size={16} color={colors.inkMuted} />
              <Text style={styles.checklistTitle}>Make sure your PAN shows</Text>
            </View>
            {[
              { text: "Your full name as on PAN", icon: "person-outline" },
              { text: "10-character PAN number", icon: "keypad-outline" },
              { text: "Date of birth", icon: "calendar-outline" },
              { text: "Father's name", icon: "people-outline" },
              { text: "Income Tax Department seal", icon: "ribbon-outline" },
            ].map((item) => (
              <View key={item.text} style={styles.checklistRow}>
                <View style={styles.checklistIconWrap}>
                  <Ionicons name={item.icon as any} size={14} color={colors.inkMuted} />
                </View>
                <Text style={styles.checklistText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* ── Info box ── */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
            <Text style={styles.infoText}>
              Your PAN is used solely for KYC verification and tax compliance. It is never shared without your consent.
            </Text>
          </View>

        </ScrollView>

        {/* ── Footer ── */}
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

// ─── PAN segment helper ───────────────────────────────────────────────────────

function getPanSegments(pan: string) {
  const letters1 = pan.slice(0, 5).padEnd(5, "_");
  const digits   = pan.slice(5, 9).padEnd(4, "_");
  const letter2  = pan.slice(9, 10).padEnd(1, "_");
  return {
    letters1,
    digits,
    letter2,
    letters1Done: pan.length >= 5,
    digitsDone:   pan.length >= 9,
    letter2Done:  pan.length >= 10,
  };
}

function PanSegment({ label, hint, done }: { label: string; hint: string; done: boolean }) {
  return (
    <View style={styles.panSegment}>
      <Text style={[styles.panSegText, done && styles.panSegTextDone]}>{label}</Text>
      <Text style={styles.panSegHint}>{hint}</Text>
    </View>
  );
}

// ─── Field helpers ────────────────────────────────────────────────────────────

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
  panInput: {
    fontSize: 22, fontWeight: "800", letterSpacing: 6,
    textAlign: "center", textTransform: "uppercase",
  },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  inputValid: { borderColor: colors.accent, backgroundColor: colors.accentSoft },

  panFormatRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", marginTop: 14, gap: 4,
  },
  panSegment: { alignItems: "center", flex: 1 },
  panSegText: {
    fontSize: 13, fontWeight: "800", color: colors.inkFaint,
    letterSpacing: 3, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  panSegTextDone: { color: colors.ink },
  panSegHint: { fontSize: 10, color: colors.inkFaint, fontWeight: "600", marginTop: 3 },
  panSep: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: 4 },

  validBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 12, backgroundColor: colors.accentSoft,
    borderRadius: radii.sm, paddingHorizontal: 10,
    paddingVertical: 6, alignSelf: "center",
  },
  validBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },

  uploadWrapper: { marginBottom: 16 },
  uploadSublabel: { fontSize: 12, color: colors.inkFaint, fontWeight: "500", marginBottom: 10, marginTop: -4 },

  uploadCard: {
    borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
    borderRadius: radii.lg, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
    paddingVertical: 32, gap: 8, ...shadows.soft,
  },
  uploadCardError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  uploadCardLoading: { opacity: 0.6 },
  uploadIconRing: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  uploadTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  uploadSubtitle: { fontSize: 12, color: colors.inkFaint, fontWeight: "500" },
  uploadMethodRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  methodChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.surfaceMuted, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  methodChipText: { fontSize: 11, color: colors.inkMuted, fontWeight: "600" },
  methodDot: { width: 3, height: 3, borderRadius: 999, backgroundColor: colors.inkFaint },

  previewCard: {
    borderRadius: radii.lg, overflow: "hidden",
    borderWidth: 1.5, borderColor: colors.accent, ...shadows.soft,
  },
  previewImage: { width: "100%", height: 200 },
  previewCornerTL: { position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: "#FFFFFF", borderTopLeftRadius: 3 },
  previewCornerTR: { position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: "#FFFFFF", borderTopRightRadius: 3 },
  previewCornerBL: { position: "absolute", bottom: 52, left: 8, width: 16, height: 16, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: "#FFFFFF", borderBottomLeftRadius: 3 },
  previewCornerBR: { position: "absolute", bottom: 52, right: 8, width: 16, height: 16, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: "#FFFFFF", borderBottomRightRadius: 3 },
  previewOverlay: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  previewBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  previewBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  previewActions: { flexDirection: "row", gap: 8 },
  previewBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.surfaceMuted, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  previewBtnDanger: { borderColor: colors.dangerSoft, backgroundColor: colors.dangerSoft },
  previewBtnText: { fontSize: 12, fontWeight: "700", color: colors.ink },

  checklistCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 14, ...shadows.soft,
  },
  checklistHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  checklistTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  checklistIconWrap: {
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  checklistText: { fontSize: 13, color: colors.inkMuted, fontWeight: "500", flex: 1 },

  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
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
