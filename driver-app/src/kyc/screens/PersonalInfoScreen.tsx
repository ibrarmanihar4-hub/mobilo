/**
 * KYC Step 1 — Personal Information
 * Uber/Ola style onboarding screen.
 * Uses local state only. No Supabase integration.
 * Navigation: prop-based (onNext) — compatible with the existing
 * App.tsx state-machine and KycFlow orchestrator.
 */

import React, { useState } from "react";
import {
  Animated,
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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PersonalInfoData {
  fullName: string;
  dob: string; // "DD/MM/YYYY"
  gender: "male" | "female" | "other" | "";
  address: string;
  emergencyContact: string;
}

interface Props {
  /** Called when the user presses Next with valid data */
  onNext: (data: PersonalInfoData) => void;
  /** Optional – go back (hide if undefined / first screen) */
  onBack?: () => void;
  /** Pre-fill if returning to this step */
  initialData?: Partial<PersonalInfoData>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 9;
const CURRENT_STEP = 1;

const GENDERS: Array<{ id: "male" | "female" | "other"; label: string; icon: string }> = [
  { id: "male", label: "Male", icon: "male" },
  { id: "female", label: "Female", icon: "female" },
  { id: "other", label: "Other", icon: "person" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 70 }, (_, i) => String(new Date().getFullYear() - 18 - i));

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PersonalInfoScreen({ onNext, onBack, initialData }: Props) {
  const [fullName, setFullName] = useState(initialData?.fullName ?? "");
  const [dob, setDob] = useState(initialData?.dob ?? "");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState<PersonalInfoData["gender"]>(
    initialData?.gender ?? ""
  );
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [emergencyContact, setEmergencyContact] = useState(
    initialData?.emergencyContact ?? ""
  );

  const [touched, setTouched] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerTab, setPickerTab] = useState<"day" | "month" | "year">("day");

  // ── Validation ──────────────────────────────────────────────────────────────

  const dobFormatted =
    dobDay && dobMonth && dobYear
      ? `${dobDay}/${String(MONTHS.indexOf(dobMonth) + 1).padStart(2, "0")}/${dobYear}`
      : dob;

  const errors = {
    fullName:
      touched && fullName.trim().length < 2 ? "Enter your full name" : "",
    dob: touched && !dobFormatted ? "Select your date of birth" : "",
    gender: touched && !gender ? "Select a gender" : "",
    address:
      touched && address.trim().length < 10
        ? "Enter your complete address"
        : "",
    emergencyContact:
      touched && emergencyContact.replace(/\D/g, "").length !== 10
        ? "Enter a valid 10-digit number"
        : "",
  };

  const isValid =
    fullName.trim().length >= 2 &&
    !!(dobDay && dobMonth && dobYear) &&
    gender !== "" &&
    address.trim().length >= 10 &&
    emergencyContact.replace(/\D/g, "").length === 10;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    onNext({
      fullName: fullName.trim(),
      dob: dobFormatted,
      gender,
      address: address.trim(),
      emergencyContact: emergencyContact.replace(/\D/g, ""),
    });
  };

  const confirmDate = () => {
    if (dobDay && dobMonth && dobYear) setDatePickerVisible(false);
  };

  const dobDisplay = dobDay && dobMonth && dobYear
    ? `${dobDay} ${dobMonth} ${dobYear}`
    : "";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Personal Info</Text>
          <Text style={styles.headerSub}>Step {CURRENT_STEP} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Progress Bar ── */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="person-circle-outline" size={32} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Tell us about yourself</Text>
              <Text style={styles.heroSub}>
                This information is used for identity verification.
              </Text>
            </View>
          </View>

          {/* ── Card ── */}
          <View style={styles.card}>

            {/* Full Name */}
            <FieldLabel label="Full Name" required />
            <TextInput
              style={[styles.input, touched && errors.fullName ? styles.inputError : null]}
              placeholder="e.g. Arjun Sharma"
              placeholderTextColor={colors.inkFaint}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <FieldError msg={errors.fullName} />

            <Divider />

            {/* Date of Birth */}
            <FieldLabel label="Date of Birth" required />
            <TouchableOpacity
              style={[
                styles.input,
                styles.inputRow,
                touched && errors.dob ? styles.inputError : null,
              ]}
              onPress={() => setDatePickerVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={dobDisplay ? colors.ink : colors.inkFaint}
              />
              <Text
                style={[
                  styles.inputRowText,
                  !dobDisplay && { color: colors.inkFaint },
                ]}
              >
                {dobDisplay || "Select date of birth"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.inkMuted} />
            </TouchableOpacity>
            <FieldError msg={errors.dob} />

            <Divider />

            {/* Gender */}
            <FieldLabel label="Gender" required />
            <View style={styles.genderRow}>
              {GENDERS.map((g) => {
                const active = gender === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.genderChip, active && styles.genderChipActive]}
                    onPress={() => setGender(g.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={g.icon as any}
                      size={16}
                      color={active ? "#FFF" : colors.inkMuted}
                    />
                    <Text
                      style={[styles.genderText, active && styles.genderTextActive]}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {touched && errors.gender ? <FieldError msg={errors.gender} /> : null}

            <Divider />

            {/* Address */}
            <FieldLabel label="Address" required />
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                touched && errors.address ? styles.inputError : null,
              ]}
              placeholder="House no., street, area, city, state, pincode"
              placeholderTextColor={colors.inkFaint}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <FieldError msg={errors.address} />

            <Divider />

            {/* Emergency Contact */}
            <FieldLabel label="Emergency Contact Number" required />
            <View
              style={[
                styles.input,
                styles.inputRow,
                touched && errors.emergencyContact ? styles.inputError : null,
              ]}
            >
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.inkFaint}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                keyboardType="number-pad"
                maxLength={10}
                returnKeyType="done"
              />
            </View>
            <FieldError msg={errors.emergencyContact} />

          </View>

          {/* ── Info note ── */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
            <Text style={styles.infoText}>
              Your data is encrypted and used only for KYC verification.
            </Text>
          </View>

        </ScrollView>

        {/* ── Next Button ── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextBtn, !isValid && touched && styles.nextBtnDisabled]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Save & Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.footerNote}>
            {TOTAL_STEPS - CURRENT_STEP} steps remaining
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── Date Picker Modal ── */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDatePickerVisible(false)}
        />
        <View style={styles.pickerSheet}>
          {/* Sheet handle */}
          <View style={styles.sheetHandle} />

          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Date of Birth</Text>
            <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
              <Ionicons name="close" size={22} color={colors.inkMuted} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.pickerTabs}>
            {(["day", "month", "year"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.pickerTab, pickerTab === t && styles.pickerTabActive]}
                onPress={() => setPickerTab(t)}
              >
                <Text
                  style={[
                    styles.pickerTabText,
                    pickerTab === t && styles.pickerTabTextActive,
                  ]}
                >
                  {t === "day"
                    ? dobDay || "Day"
                    : t === "month"
                    ? dobMonth || "Month"
                    : dobYear || "Year"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Options list */}
          <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
            {pickerTab === "day" &&
              DAYS.map((d) => (
                <PickerOption
                  key={d}
                  label={d}
                  selected={dobDay === d}
                  onPress={() => { setDobDay(d); setPickerTab("month"); }}
                />
              ))}
            {pickerTab === "month" &&
              MONTHS.map((m) => (
                <PickerOption
                  key={m}
                  label={m}
                  selected={dobMonth === m}
                  onPress={() => { setDobMonth(m); setPickerTab("year"); }}
                />
              ))}
            {pickerTab === "year" &&
              YEARS.map((y) => (
                <PickerOption
                  key={y}
                  label={y}
                  selected={dobYear === y}
                  onPress={() => setDobYear(y)}
                />
              ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              !(dobDay && dobMonth && dobYear) && { opacity: 0.4 },
            ]}
            onPress={confirmDate}
            disabled={!(dobDay && dobMonth && dobYear)}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>Confirm Date</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
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

function Divider() {
  return <View style={styles.divider} />;
}

function PickerOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.pickerOption, selected && styles.pickerOptionSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>
        {label}
      </Text>
      {selected && <Ionicons name="checkmark" size={16} color={colors.accent} />}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  headerSub: { fontSize: 11, color: colors.inkMuted, fontWeight: "600", marginTop: 1 },

  // Progress
  progressTrack: {
    height: 3,
    backgroundColor: colors.borderSoft,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent,
    borderRadius: 999,
  },

  // Scroll
  scroll: { padding: 20, paddingBottom: 12 },

  // Hero
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  heroSub: { fontSize: 13, color: colors.inkMuted, marginTop: 3, lineHeight: 18 },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 8,
    ...shadows.soft,
  },

  // Fields
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 0,
    height: 50,
  },
  inputRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  textArea: {
    height: 88,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  phonePrefix: {
    backgroundColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: -2,
  },
  phonePrefixText: { fontSize: 14, fontWeight: "800", color: colors.ink },
  phoneInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
    paddingVertical: 0,
  },

  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 16 },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    marginBottom: 2,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },

  // Gender chips
  genderRow: { flexDirection: "row", gap: 10 },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  genderChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  genderText: { fontSize: 13, fontWeight: "700", color: colors.inkMuted },
  genderTextActive: { color: "#FFFFFF" },

  // Info box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  infoText: { flex: 1, fontSize: 12, color: "#065F46", fontWeight: "600", lineHeight: 17 },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: 8,
  },
  nextBtn: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...shadows.soft,
  },
  nextBtnDisabled: { backgroundColor: colors.inkFaint, opacity: 0.55 },
  nextBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  footerNote: {
    textAlign: "center",
    fontSize: 12,
    color: colors.inkFaint,
    fontWeight: "500",
  },

  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    maxHeight: "68%",
    ...shadows.floating,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  pickerTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  pickerTabs: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  pickerTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radii.sm,
    alignItems: "center",
  },
  pickerTabActive: { backgroundColor: colors.surface, ...shadows.soft },
  pickerTabText: { fontSize: 13, fontWeight: "700", color: colors.inkMuted },
  pickerTabTextActive: { color: colors.ink },
  pickerList: { maxHeight: 260, marginHorizontal: 20 },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    marginBottom: 2,
  },
  pickerOptionSelected: { backgroundColor: colors.accentSoft },
  pickerOptionText: { fontSize: 15, fontWeight: "600", color: colors.ink },
  pickerOptionTextSelected: { color: colors.accent, fontWeight: "800" },
  confirmBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
