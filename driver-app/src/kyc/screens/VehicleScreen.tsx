/**
 * KYC Step 6 — Vehicle Information
 * Uber/Ola style. Local state only. No Supabase.
 * Navigation: prop-based (onNext / onBack).
 */

import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import type { KycVehicle, VehicleType } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onNext: (data: KycVehicle) => void;
  onBack: () => void;
  initialData?: Partial<KycVehicle>;
}

const TOTAL_STEPS = 9;
const CURRENT_STEP = 6;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() + i));

const VEHICLE_TYPES: Array<{ id: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { id: "car",  label: "Car",  icon: "car-outline" },
  { id: "bike", label: "Bike", icon: "bicycle-outline" },
  { id: "auto", label: "Auto", icon: "car-sport-outline" },
  { id: "bus",  label: "Bus",  icon: "bus-outline" },
];

// ─── Image picker helpers ─────────────────────────────────────────────────────

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
    const res = await IP.launchImageLibraryAsync({ mediaTypes: IP.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
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

function openPicker(onPicked: (uri: string) => void) {
  if (Platform.OS === "web") {
    pickFromGallery().then((u) => { if (u) onPicked(u); });
    return;
  }
  Alert.alert("Upload Document", "Choose a source", [
    { text: "Camera",  onPress: async () => { const u = await pickFromCamera();  if (u) onPicked(u); } },
    { text: "Gallery", onPress: async () => { const u = await pickFromGallery(); if (u) onPicked(u); } },
    { text: "Cancel", style: "cancel" },
  ]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VehicleScreen({ onNext, onBack, initialData }: Props) {
  const [vehicleType,   setVehicleType]   = useState<VehicleType | "">(initialData?.vehicleType  ?? "");
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicleNumber ?? "");
  const [vehicleModel,  setVehicleModel]  = useState(initialData?.vehicleModel  ?? "");
  const [vehicleColor,  setVehicleColor]  = useState(initialData?.vehicleColor  ?? "");
  const [rcNumber,      setRcNumber]      = useState(initialData?.rcNumber      ?? "");
  const [rcFrontImage,  setRcFrontImage]  = useState<string | null>(initialData?.rcFrontImage ?? null);
  const [rcBackImage,   setRcBackImage]   = useState<string | null>(initialData?.rcBackImage  ?? null);
  const [loadingFront,  setLoadingFront]  = useState(false);
  const [loadingBack,   setLoadingBack]   = useState(false);
  const [touched,       setTouched]       = useState(false);

  // RC Expiry date state (not in KycVehicle type but shown for UX completeness; stored in rcNumber as fallback)
  // Date picker state for a future "RC Expiry" field if needed — omitted for now per types.ts

  const cleanVehicleNumber = vehicleNumber.trim().toUpperCase();
  const cleanRcNumber      = rcNumber.trim().toUpperCase();

  const isVehicleNumberValid = cleanVehicleNumber.length >= 5;
  const isRcNumberValid      = cleanRcNumber.length >= 5;
  const isModelValid         = vehicleModel.trim().length > 0;
  const isColorValid         = vehicleColor.trim().length > 0;

  const errors = {
    vehicleType:   touched && !vehicleType          ? "Select a vehicle type"           : "",
    vehicleNumber: touched && !isVehicleNumberValid ? "Enter a valid vehicle number"    : "",
    vehicleModel:  touched && !isModelValid         ? "Vehicle model is required"       : "",
    vehicleColor:  touched && !isColorValid         ? "Vehicle color is required"       : "",
    rcNumber:      touched && !isRcNumberValid      ? "Enter a valid RC number"         : "",
    rcFrontImage:  touched && !rcFrontImage         ? "RC front image is required"      : "",
    rcBackImage:   touched && !rcBackImage          ? "RC back image is required"       : "",
  };

  const isValid =
    !!vehicleType &&
    isVehicleNumberValid &&
    isModelValid &&
    isColorValid &&
    isRcNumberValid &&
    !!rcFrontImage &&
    !!rcBackImage;

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    onNext({
      vehicleType: vehicleType as VehicleType,
      vehicleNumber: cleanVehicleNumber,
      vehicleModel: vehicleModel.trim(),
      vehicleColor: vehicleColor.trim(),
      rcNumber: cleanRcNumber,
      rcFrontImage,
      rcBackImage,
    });
  };

  const handlePickFront = () => {
    setLoadingFront(true);
    openPicker((uri) => { setRcFrontImage(uri); setLoadingFront(false); });
    setTimeout(() => setLoadingFront(false), 30000);
  };
  const handlePickBack = () => {
    setLoadingBack(true);
    openPicker((uri) => { setRcBackImage(uri); setLoadingBack(false); });
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
          <Text style={styles.headerTitle}>Vehicle Info</Text>
          <Text style={styles.headerSub}>Step {CURRENT_STEP} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Progress ── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="car-outline" size={30} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Vehicle Details</Text>
              <Text style={styles.heroSub}>Provide details about the vehicle you will use for rides.</Text>
            </View>
          </View>

          {/* ── Vehicle Type ── */}
          <View style={styles.card}>
            <FieldLabel label="Vehicle Type" required />
            <View style={styles.vehicleGrid}>
              {VEHICLE_TYPES.map((v) => {
                const active = vehicleType === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehicleChip, active && styles.vehicleChipActive]}
                    onPress={() => setVehicleType(v.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={v.icon} size={20} color={active ? "#FFF" : colors.inkMuted} />
                    <Text style={[styles.vehicleChipText, active && styles.vehicleChipTextActive]}>{v.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {touched && errors.vehicleType ? <FieldError msg={errors.vehicleType} /> : null}

            <View style={styles.divider} />

            {/* Vehicle Number */}
            <FieldLabel label="Vehicle Number" required />
            <TextInput
              style={[styles.input, touched && errors.vehicleNumber ? styles.inputError : isVehicleNumberValid && vehicleNumber ? styles.inputValid : null]}
              placeholder="e.g. MH09AB1234"
              placeholderTextColor={colors.inkFaint}
              value={vehicleNumber}
              onChangeText={(v) => setVehicleNumber(v.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="next"
            />
            {touched && errors.vehicleNumber ? <FieldError msg={errors.vehicleNumber} /> : null}

            <View style={styles.divider} />

            {/* Vehicle Model */}
            <FieldLabel label="Vehicle Model" required />
            <TextInput
              style={[styles.input, touched && errors.vehicleModel ? styles.inputError : isModelValid && vehicleModel ? styles.inputValid : null]}
              placeholder="e.g. Hyundai Aura"
              placeholderTextColor={colors.inkFaint}
              value={vehicleModel}
              onChangeText={setVehicleModel}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {touched && errors.vehicleModel ? <FieldError msg={errors.vehicleModel} /> : null}

            <View style={styles.divider} />

            {/* Vehicle Color */}
            <FieldLabel label="Vehicle Color" required />
            <TextInput
              style={[styles.input, touched && errors.vehicleColor ? styles.inputError : isColorValid && vehicleColor ? styles.inputValid : null]}
              placeholder="e.g. White"
              placeholderTextColor={colors.inkFaint}
              value={vehicleColor}
              onChangeText={setVehicleColor}
              autoCapitalize="words"
              returnKeyType="next"
            />
            {touched && errors.vehicleColor ? <FieldError msg={errors.vehicleColor} /> : null}

            <View style={styles.divider} />

            {/* RC Number */}
            <FieldLabel label="RC Number" required />
            <TextInput
              style={[styles.input, touched && errors.rcNumber ? styles.inputError : isRcNumberValid && rcNumber ? styles.inputValid : null]}
              placeholder="Registration Certificate Number"
              placeholderTextColor={colors.inkFaint}
              value={rcNumber}
              onChangeText={(v) => setRcNumber(v.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="done"
            />
            {touched && errors.rcNumber ? <FieldError msg={errors.rcNumber} /> : null}
          </View>

          {/* ── Upload: RC Front ── */}
          <UploadCard
            label="RC Front Image"
            sublabel="Front side of your Registration Certificate"
            icon="id-card-outline"
            imageUri={rcFrontImage}
            loading={loadingFront}
            error={touched ? errors.rcFrontImage : ""}
            onPress={handlePickFront}
            onRemove={() => setRcFrontImage(null)}
            required
          />

          {/* ── Upload: RC Back ── */}
          <UploadCard
            label="RC Back Image"
            sublabel="Back side of your Registration Certificate"
            icon="document-outline"
            imageUri={rcBackImage}
            loading={loadingBack}
            error={touched ? errors.rcBackImage : ""}
            onPress={handlePickBack}
            onRemove={() => setRcBackImage(null)}
            required
          />

          {/* ── Tips ── */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={15} color={colors.warning} />
              <Text style={styles.tipsTitle}>Tips for uploading</Text>
            </View>
            {["Place RC on a flat surface","Ensure all 4 corners are visible","Avoid glare and reflections","Text must be clearly readable"].map((t) => (
              <View key={t} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* ── Info ── */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
            <Text style={styles.infoText}>Your vehicle information is securely stored and used only for KYC verification.</Text>
          </View>

        </ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.prevBtn} onPress={onBack} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color={colors.ink} />
              <Text style={styles.prevBtnText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.nextBtn, !isValid && styles.nextBtnDisabled]} onPress={handleNext} activeOpacity={0.85}>
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

// ─── UploadCard ───────────────────────────────────────────────────────────────

interface UploadCardProps {
  label: string; sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageUri: string | null; loading: boolean; error: string;
  onPress: () => void; onRemove: () => void; required?: boolean;
}

function UploadCard({ label, sublabel, icon, imageUri, loading, error, onPress, onRemove, required }: UploadCardProps) {
  return (
    <View style={styles.uploadWrapper}>
      <FieldLabel label={label} required={required} />
      <Text style={styles.uploadSublabel}>{sublabel}</Text>
      {imageUri ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewCornerTL} /><View style={styles.previewCornerTR} />
          <View style={styles.previewCornerBL} /><View style={styles.previewCornerBR} />
          <View style={styles.previewBar}>
            <View style={styles.previewBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
              <Text style={styles.previewBadgeText}>Uploaded</Text>
            </View>
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.previewBtn} onPress={onPress} activeOpacity={0.8}>
                <Ionicons name="camera-outline" size={14} color={colors.ink} />
                <Text style={styles.previewBtnText}>Replace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.previewBtn, styles.previewBtnDanger]} onPress={onRemove} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={[styles.previewBtnText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.uploadCard, error ? styles.uploadCardError : null, loading ? styles.uploadCardLoading : null]}
          onPress={onPress} disabled={loading} activeOpacity={0.8}
        >
          <View style={styles.uploadIconRing}>
            <Ionicons name={loading ? "hourglass-outline" : icon} size={26} color={loading ? colors.inkFaint : colors.inkMuted} />
          </View>
          <Text style={styles.uploadTitle}>{loading ? "Opening…" : "Tap to upload"}</Text>
          <Text style={styles.uploadSubtitle}>Camera or Gallery · JPG/PNG</Text>
          <View style={styles.uploadChipRow}>
            <View style={styles.uploadChip}><Ionicons name="camera" size={11} color={colors.inkMuted} /><Text style={styles.uploadChipText}>Camera</Text></View>
            <View style={styles.uploadChip}><Ionicons name="images-outline" size={11} color={colors.inkMuted} /><Text style={styles.uploadChipText}>Gallery</Text></View>
          </View>
        </TouchableOpacity>
      )}
      {error ? <FieldError msg={error} /> : null}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  backBtn: { width: 38, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  headerSub: { fontSize: 11, color: colors.inkMuted, fontWeight: "600", marginTop: 1 },
  progressTrack: { height: 3, backgroundColor: colors.borderSoft },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 999 },
  scroll: { padding: 20, paddingBottom: 12 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  heroIconWrap: { width: 54, height: 54, borderRadius: radii.md, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  heroSub: { fontSize: 13, color: colors.inkMuted, marginTop: 3, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 18, marginBottom: 16, ...shadows.soft },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input: { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontWeight: "600", color: colors.ink },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  inputValid: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 16 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },

  // Vehicle type chips
  vehicleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  vehicleChip: {
    width: "46%", flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  vehicleChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  vehicleChipText: { fontSize: 14, fontWeight: "700", color: colors.inkMuted },
  vehicleChipTextActive: { color: "#FFFFFF" },

  // Upload
  uploadWrapper: { marginBottom: 16 },
  uploadSublabel: { fontSize: 12, color: colors.inkFaint, fontWeight: "500", marginBottom: 10, marginTop: -4 },
  uploadCard: { borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed", borderRadius: radii.lg, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingVertical: 28, gap: 6, ...shadows.soft },
  uploadCardError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  uploadCardLoading: { opacity: 0.6 },
  uploadIconRing: { width: 56, height: 56, borderRadius: 999, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  uploadTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  uploadSubtitle: { fontSize: 12, color: colors.inkFaint, fontWeight: "500" },
  uploadChipRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  uploadChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceMuted, borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 4 },
  uploadChipText: { fontSize: 11, color: colors.inkMuted, fontWeight: "600" },
  previewCard: { borderRadius: radii.lg, overflow: "hidden", borderWidth: 1.5, borderColor: colors.accent, ...shadows.soft },
  previewImage: { width: "100%", height: 180 },
  previewCornerTL: { position: "absolute", top: 8, left: 8, width: 16, height: 16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderColor: "#FFF", borderTopLeftRadius: 3 },
  previewCornerTR: { position: "absolute", top: 8, right: 8, width: 16, height: 16, borderTopWidth: 2.5, borderRightWidth: 2.5, borderColor: "#FFF", borderTopRightRadius: 3 },
  previewCornerBL: { position: "absolute", bottom: 52, left: 8, width: 16, height: 16, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderColor: "#FFF", borderBottomLeftRadius: 3 },
  previewCornerBR: { position: "absolute", bottom: 52, right: 8, width: 16, height: 16, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderColor: "#FFF", borderBottomRightRadius: 3 },
  previewBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  previewBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  previewBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  previewActions: { flexDirection: "row", gap: 8 },
  previewBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  previewBtnDanger: { borderColor: colors.dangerSoft, backgroundColor: colors.dangerSoft },
  previewBtnText: { fontSize: 12, fontWeight: "700", color: colors.ink },

  // Tips
  tipsCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14, ...shadows.soft },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  tipsTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  tipDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.accent },
  tipText: { fontSize: 13, color: colors.inkMuted, fontWeight: "500" },

  // Info box
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.accentSoft, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 8 },
  infoText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "600", lineHeight: 17 },

  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft, gap: 8 },
  footerRow: { flexDirection: "row", gap: 12 },
  prevBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 15 },
  prevBtnText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  nextBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.ink, borderRadius: radii.md, paddingVertical: 15, ...shadows.soft },
  nextBtnDisabled: { backgroundColor: colors.inkFaint, opacity: 0.5 },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  footerNote: { textAlign: "center", fontSize: 12, color: colors.inkFaint, fontWeight: "500" },
});
