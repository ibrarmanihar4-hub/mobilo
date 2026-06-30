/**
 * KYC Step 4 — Driving License Verification
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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrivingLicenseData {
  licenseNumber: string;
  expiryDate: string; // "DD/MM/YYYY"
  frontImage: string | null;
  backImage: string | null;
}

interface Props {
  onNext: (data: DrivingLicenseData) => void;
  onBack: () => void;
  initialData?: Partial<DrivingLicenseData>;
}

const TOTAL_STEPS = 9;
const CURRENT_STEP = 4;

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS  = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() + i));

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

export default function DrivingLicenseScreen({ onNext, onBack, initialData }: Props) {
  const [licenseNumber, setLicenseNumber] = useState(initialData?.licenseNumber ?? "");
  const [frontImage,    setFrontImage]    = useState<string | null>(initialData?.frontImage ?? null);
  const [backImage,     setBackImage]     = useState<string | null>(initialData?.backImage  ?? null);
  const [loadingFront,  setLoadingFront]  = useState(false);
  const [loadingBack,   setLoadingBack]   = useState(false);
  const [touched,       setTouched]       = useState(false);

  // Date picker state
  const [dateModal,   setDateModal]   = useState(false);
  const [pickerTab,   setPickerTab]   = useState<"day" | "month" | "year">("day");
  const [selDay,      setSelDay]      = useState("");
  const [selMonth,    setSelMonth]    = useState("");
  const [selYear,     setSelYear]     = useState("");

  const expiryDisplay = selDay && selMonth && selYear
    ? `${selDay} ${selMonth} ${selYear}` : "";
  const expiryValue = selDay && selMonth && selYear
    ? `${selDay}/${String(MONTHS.indexOf(selMonth) + 1).padStart(2,"0")}/${selYear}` : "";

  // Validate license: letters/digits, at least 8 chars (Indian DL format)
  const cleanLicense = licenseNumber.trim().toUpperCase();
  const isLicenseValid = cleanLicense.length >= 8;

  const errors = {
    licenseNumber: touched && !isLicenseValid ? "Enter a valid driving license number" : "",
    expiryDate:    touched && !expiryValue    ? "Select the license expiry date"        : "",
    frontImage:    touched && !frontImage     ? "Front side of license is required"     : "",
    backImage:     touched && !backImage      ? "Back side of license is required"      : "",
  };

  const isValid = isLicenseValid && !!expiryValue && !!frontImage && !!backImage;

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    onNext({ licenseNumber: cleanLicense, expiryDate: expiryValue, frontImage, backImage });
  };

  const handlePickFront = () => {
    setLoadingFront(true);
    openPicker((uri) => { setFrontImage(uri); setLoadingFront(false); });
    setTimeout(() => setLoadingFront(false), 30000);
  };
  const handlePickBack = () => {
    setLoadingBack(true);
    openPicker((uri) => { setBackImage(uri); setLoadingBack(false); });
    setTimeout(() => setLoadingBack(false), 30000);
  };

  const confirmDate = () => { if (selDay && selMonth && selYear) setDateModal(false); };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Driving License</Text>
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
              <Text style={styles.heroTitle}>Driving License</Text>
              <Text style={styles.heroSub}>A valid DL is required to operate as a driver on the platform.</Text>
            </View>
          </View>

          {/* ── Fields Card ── */}
          <View style={styles.card}>

            {/* License Number */}
            <FieldLabel label="License Number" required />
            <TextInput
              style={[styles.input, touched && errors.licenseNumber ? styles.inputError : isLicenseValid ? styles.inputValid : null]}
              placeholder="e.g. MH0120180012345"
              placeholderTextColor={colors.inkFaint}
              value={licenseNumber}
              onChangeText={(v) => setLicenseNumber(v.toUpperCase())}
              autoCapitalize="characters"
              returnKeyType="done"
            />
            {touched && errors.licenseNumber ? <FieldError msg={errors.licenseNumber} /> : null}
            {isLicenseValid && (
              <View style={styles.validBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.accent} />
                <Text style={styles.validBadgeText}>License number entered</Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* Expiry Date */}
            <FieldLabel label="Expiry Date" required />
            <TouchableOpacity
              style={[styles.input, styles.dateRow, touched && errors.expiryDate ? styles.inputError : expiryValue ? styles.inputValid : null]}
              onPress={() => setDateModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={expiryDisplay ? colors.ink : colors.inkFaint} />
              <Text style={[styles.dateText, !expiryDisplay && { color: colors.inkFaint }]}>
                {expiryDisplay || "Select expiry date"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
            {touched && errors.expiryDate ? <FieldError msg={errors.expiryDate} /> : null}

          </View>

          {/* ── Upload: Front ── */}
          <UploadCard
            label="License Front"
            sublabel="Side showing your photo, name and DL number"
            icon="id-card-outline"
            imageUri={frontImage}
            loading={loadingFront}
            error={touched ? errors.frontImage : ""}
            onPress={handlePickFront}
            onRemove={() => setFrontImage(null)}
            required
          />

          {/* ── Upload: Back ── */}
          <UploadCard
            label="License Back"
            sublabel="Side showing vehicle categories and validity"
            icon="list-outline"
            imageUri={backImage}
            loading={loadingBack}
            error={touched ? errors.backImage : ""}
            onPress={handlePickBack}
            onRemove={() => setBackImage(null)}
            required
          />

          {/* ── Tips ── */}
          <View style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb-outline" size={15} color={colors.warning} />
              <Text style={styles.tipsTitle}>Tips for uploading</Text>
            </View>
            {["Place license on a flat surface","Ensure all 4 corners are visible","Avoid glare and reflections","Text must be clearly readable"].map((t) => (
              <View key={t} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{t}</Text>
              </View>
            ))}
          </View>

          {/* ── Info ── */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
            <Text style={styles.infoText}>Your driving license is securely stored and used only for KYC verification.</Text>
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

      {/* ── Date Picker Modal ── */}
      <Modal visible={dateModal} transparent animationType="slide" onRequestClose={() => setDateModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDateModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Expiry Date</Text>
            <TouchableOpacity onPress={() => setDateModal(false)}>
              <Ionicons name="close" size={22} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.pickerTabs}>
            {(["day","month","year"] as const).map((t) => (
              <TouchableOpacity key={t} style={[styles.pickerTab, pickerTab === t && styles.pickerTabActive]} onPress={() => setPickerTab(t)}>
                <Text style={[styles.pickerTabText, pickerTab === t && styles.pickerTabTextActive]}>
                  {t === "day" ? selDay || "Day" : t === "month" ? selMonth || "Month" : selYear || "Year"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
            {pickerTab === "day"   && DAYS.map((d)   => <PickerOption key={d} label={d} selected={selDay   === d} onPress={() => { setSelDay(d);   setPickerTab("month"); }} />)}
            {pickerTab === "month" && MONTHS.map((m) => <PickerOption key={m} label={m} selected={selMonth === m} onPress={() => { setSelMonth(m); setPickerTab("year");  }} />)}
            {pickerTab === "year"  && YEARS.map((y)  => <PickerOption key={y} label={y} selected={selYear  === y} onPress={() => setSelYear(y)} />)}
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmBtn, !(selDay && selMonth && selYear) && { opacity: 0.4 }]}
            onPress={confirmDate}
            disabled={!(selDay && selMonth && selYear)}
          >
            <Text style={styles.confirmBtnText}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
function PickerOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.pickerOption, selected && styles.pickerOptionSelected]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={16} color={colors.accent} />}
    </TouchableOpacity>
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
  dateRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 0, height: 50 },
  dateText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 16 },
  validBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, backgroundColor: colors.accentSoft, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  validBadgeText: { fontSize: 12, fontWeight: "700", color: colors.accent },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
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
  tipsCard: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14, ...shadows.soft },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  tipsTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 7 },
  tipDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: colors.accent },
  tipText: { fontSize: 13, color: colors.inkMuted, fontWeight: "500" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: colors.accentSoft, borderRadius: radii.md, padding: 12, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 8 },
  infoText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "600", lineHeight: 17 },
  footer: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft, gap: 8 },
  footerRow: { flexDirection: "row", gap: 12 },
  prevBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, paddingVertical: 15 },
  prevBtnText: { fontSize: 15, fontWeight: "700", color: colors.ink },
  nextBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.ink, borderRadius: radii.md, paddingVertical: 15, ...shadows.soft },
  nextBtnDisabled: { backgroundColor: colors.inkFaint, opacity: 0.5 },
  nextBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  footerNote: { textAlign: "center", fontSize: 12, color: colors.inkFaint, fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: "68%", ...shadows.floating },
  sheetHandle: { width: 40, height: 4, borderRadius: 999, backgroundColor: colors.border, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  pickerTabs: { flexDirection: "row", marginHorizontal: 20, marginTop: 14, marginBottom: 8, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: 4, gap: 4 },
  pickerTab: { flex: 1, paddingVertical: 9, borderRadius: radii.sm, alignItems: "center" },
  pickerTabActive: { backgroundColor: colors.surface, ...shadows.soft },
  pickerTabText: { fontSize: 13, fontWeight: "700", color: colors.inkMuted },
  pickerTabTextActive: { color: colors.ink },
  pickerList: { maxHeight: 260, marginHorizontal: 20 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 14, borderRadius: radii.sm, marginBottom: 2 },
  pickerOptionSelected: { backgroundColor: colors.accentSoft },
  pickerOptionText: { fontSize: 15, fontWeight: "600", color: colors.ink },
  pickerOptionTextSelected: { color: colors.accent, fontWeight: "800" },
  confirmBtn: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.ink, borderRadius: radii.md, paddingVertical: 15, alignItems: "center" },
  confirmBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
