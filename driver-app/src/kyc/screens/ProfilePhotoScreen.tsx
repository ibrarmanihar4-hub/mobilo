/**
 * KYC Step 5 — Profile Photo
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
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows } from "../../theme";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProfilePhotoData {
  selfieImage: string;
}

interface Props {
  onNext: (data: ProfilePhotoData) => void;
  onBack: () => void;
  initialData?: Partial<ProfilePhotoData>;
}

const TOTAL_STEPS = 9;
const CURRENT_STEP = 5;

const INSTRUCTIONS = [
  { text: "Ensure your face is clearly visible",  icon: "eye-outline"          },
  { text: "Remove sunglasses or masks",            icon: "glasses-outline"      },
  { text: "Use good lighting — avoid shadows",     icon: "sunny-outline"        },
  { text: "Upload a recent photo",                 icon: "time-outline"         },
  { text: "Plain or neutral background preferred", icon: "image-outline"        },
];

// ─── Image picker helpers ─────────────────────────────────────────────────────

async function pickFromGallery(): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IP = require("expo-image-picker");
    if (Platform.OS !== "web") {
      const { status } = await IP.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo access to upload your profile photo.");
        return null;
      }
    }
    const res = await IP.launchImageLibraryAsync({
      mediaTypes: IP.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
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
        Alert.alert("Permission needed", "Allow camera access to take your selfie.");
        return null;
      }
    }
    const res = await IP.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      cameraType: IP.CameraType?.front ?? "front",
    });
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
  Alert.alert("Upload Profile Photo", "Choose a source", [
    {
      text: "Take Selfie",
      onPress: async () => { const u = await pickFromCamera();  if (u) onPicked(u); },
    },
    {
      text: "Choose from Gallery",
      onPress: async () => { const u = await pickFromGallery(); if (u) onPicked(u); },
    },
    { text: "Cancel", style: "cancel" },
  ]);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfilePhotoScreen({ onNext, onBack, initialData }: Props) {
  const [photo,   setPhoto]   = useState<string | null>(initialData?.selfieImage ?? null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const isValid = !!photo;

  const handleNext = () => {
    setTouched(true);
    if (!isValid) return;
    onNext({ selfieImage: photo! });
  };

  const handlePick = () => {
    setLoading(true);
    openPicker((uri) => { setPhoto(uri); setLoading(false); });
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
          <Text style={styles.headerTitle}>Profile Photo</Text>
          <Text style={styles.headerSub}>Step {CURRENT_STEP} of {TOTAL_STEPS}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(CURRENT_STEP / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Hero ── */}
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="camera-outline" size={30} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Your Profile Photo</Text>
              <Text style={styles.heroSub}>
                Riders see this photo when you accept their trip. Make it clear and professional.
              </Text>
            </View>
          </View>

          {/* ── Photo preview / upload ── */}
          <View style={styles.photoSection}>
            {photo ? (
              /* ── Filled state ── */
              <View style={styles.photoFilled}>
                {/* Circular avatar */}
                <View style={styles.avatarRing}>
                  <Image source={{ uri: photo }} style={styles.avatar} />
                  {/* Online dot */}
                  <View style={styles.onlineDot} />
                </View>

                {/* Status badge */}
                <View style={styles.uploadedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
                  <Text style={styles.uploadedBadgeText}>Photo uploaded</Text>
                </View>

                {/* Actions */}
                <View style={styles.photoActions}>
                  <TouchableOpacity style={styles.replaceBtn} onPress={handlePick} activeOpacity={0.85}>
                    <Ionicons name="camera-reverse-outline" size={18} color={colors.ink} />
                    <Text style={styles.replaceBtnText}>Retake / Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setPhoto(null)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── Empty state ── */
              <View style={styles.photoEmpty}>
                {/* Ghost avatar */}
                <TouchableOpacity
                  style={[styles.ghostAvatar, touched && !photo && styles.ghostAvatarError]}
                  onPress={handlePick}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <Ionicons name="hourglass-outline" size={36} color={colors.inkFaint} />
                  ) : (
                    <>
                      <Ionicons name="person-outline" size={48} color={colors.inkFaint} />
                      <View style={styles.cameraOverlay}>
                        <Ionicons name="camera" size={18} color="#FFFFFF" />
                      </View>
                    </>
                  )}
                </TouchableOpacity>

                {touched && !photo ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
                    <Text style={styles.errorText}>Profile photo is required</Text>
                  </View>
                ) : null}

                {/* Upload buttons */}
                <View style={styles.uploadBtnsRow}>
                  <TouchableOpacity
                    style={styles.uploadOptionBtn}
                    onPress={async () => {
                      setLoading(true);
                      const u = await pickFromCamera();
                      setLoading(false);
                      if (u) setPhoto(u);
                    }}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <View style={styles.uploadOptionIcon}>
                      <Ionicons name="camera" size={22} color={colors.ink} />
                    </View>
                    <Text style={styles.uploadOptionLabel}>Take Selfie</Text>
                    <Text style={styles.uploadOptionSub}>Use front camera</Text>
                  </TouchableOpacity>

                  <View style={styles.uploadOptionDivider} />

                  <TouchableOpacity
                    style={styles.uploadOptionBtn}
                    onPress={async () => {
                      setLoading(true);
                      const u = await pickFromGallery();
                      setLoading(false);
                      if (u) setPhoto(u);
                    }}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <View style={styles.uploadOptionIcon}>
                      <Ionicons name="images-outline" size={22} color={colors.ink} />
                    </View>
                    <Text style={styles.uploadOptionLabel}>From Gallery</Text>
                    <Text style={styles.uploadOptionSub}>Choose existing</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Instructions card ── */}
          <View style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <View style={styles.instructionsIconWrap}>
                <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.instructionsTitle}>Photo Guidelines</Text>
            </View>
            {INSTRUCTIONS.map((item, i) => (
              <View key={i} style={styles.instructionRow}>
                <View style={styles.instructionIconWrap}>
                  <Ionicons name={item.icon as any} size={15} color={colors.accent} />
                </View>
                <Text style={styles.instructionText}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* ── Why we need it ── */}
          <View style={styles.whyCard}>
            <Ionicons name="people-outline" size={15} color={colors.inkMuted} style={{ marginTop: 1 }} />
            <Text style={styles.whyText}>
              Your photo helps riders identify you at pickup and builds trust on the platform.
            </Text>
          </View>

          {/* ── Security note ── */}
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.accent} />
            <Text style={styles.infoText}>
              Your photo is only visible to riders who have been matched with you on a trip.
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Header
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  backBtn: { width: 38, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  headerSub: { fontSize: 11, color: colors.inkMuted, fontWeight: "600", marginTop: 1 },

  // Progress
  progressTrack: { height: 3, backgroundColor: colors.borderSoft },
  progressFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 999 },

  scroll: { padding: 20, paddingBottom: 12 },

  // Hero
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  heroIconWrap: { width: 54, height: 54, borderRadius: radii.md, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
  heroSub: { fontSize: 13, color: colors.inkMuted, marginTop: 3, lineHeight: 18 },

  // Photo section container
  photoSection: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 16, overflow: "hidden", ...shadows.soft,
  },

  // ── Filled state
  photoFilled: { alignItems: "center", paddingVertical: 28, paddingHorizontal: 20 },
  avatarRing: {
    width: 140, height: 140, borderRadius: 999,
    borderWidth: 3, borderColor: colors.accent,
    padding: 3, marginBottom: 16,
    ...shadows.floating,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 999 },
  onlineDot: {
    position: "absolute", bottom: 6, right: 6,
    width: 18, height: 18, borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 2.5, borderColor: colors.surface,
  },
  uploadedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7, marginBottom: 18,
  },
  uploadedBadgeText: { fontSize: 13, fontWeight: "700", color: colors.accent },
  photoActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  replaceBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surfaceMuted, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, paddingVertical: 11,
  },
  replaceBtnText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  removeBtn: {
    width: 42, height: 42, borderRadius: radii.md,
    backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.dangerSoft,
    alignItems: "center", justifyContent: "center",
  },

  // ── Empty state
  photoEmpty: { alignItems: "center", paddingTop: 28, paddingBottom: 20, paddingHorizontal: 20 },
  ghostAvatar: {
    width: 140, height: 140, borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
    marginBottom: 8, ...shadows.soft,
  },
  ghostAvatarError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  cameraOverlay: {
    position: "absolute", bottom: 8, right: 8,
    width: 32, height: 32, borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surface,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 16 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },

  // Upload option buttons (Camera / Gallery side by side)
  uploadBtnsRow: {
    flexDirection: "row", width: "100%",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    overflow: "hidden", marginTop: 8,
  },
  uploadOptionBtn: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 6 },
  uploadOptionDivider: { width: 1, backgroundColor: colors.border },
  uploadOptionIcon: {
    width: 46, height: 46, borderRadius: 999,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  uploadOptionLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
  uploadOptionSub: { fontSize: 11, color: colors.inkFaint, fontWeight: "500" },

  // Instructions card
  instructionsCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginBottom: 14, ...shadows.soft,
  },
  instructionsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  instructionsIconWrap: {
    width: 30, height: 30, borderRadius: 999,
    backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center",
  },
  instructionsTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  instructionRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 11 },
  instructionIconWrap: {
    width: 30, height: 30, borderRadius: 999,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: "#A7F3D0",
    alignItems: "center", justifyContent: "center",
  },
  instructionText: { flex: 1, fontSize: 13, color: colors.inkMuted, fontWeight: "500", lineHeight: 18 },

  // Why card
  whyCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: colors.surface, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 12, ...shadows.soft,
  },
  whyText: { flex: 1, fontSize: 13, color: colors.inkMuted, fontWeight: "500", lineHeight: 18 },

  // Info box
  infoBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: colors.accentSoft, borderRadius: radii.md,
    padding: 12, borderWidth: 1, borderColor: "#A7F3D0", marginBottom: 8,
  },
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
