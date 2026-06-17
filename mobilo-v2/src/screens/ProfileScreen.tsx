import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";

import { useAuth } from "../context/AuthContext";
import { useBookingHistory } from "../context/BookingHistoryContext";
import { colors, radii } from "../theme/theme";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { bookings } = useBookingHistory();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const promptLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch {
            // ignore
          }
        },
      },
    ]);
  };

  const ridesTaken = bookings.length;
  const uniqueRoutes = new Set(bookings.map((b) => b.route)).size;

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader title="Profile" subtitle="Account, preferences, and support." />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Identity */}
            <View style={styles.identityCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user?.fullName || "M").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {user?.fullName || "Mobilo Rider"}
                </Text>
                <Text style={styles.handle}>
                  {user?.phoneDisplay ||
                    user?.phoneNumber ||
                    "guest@mobilo.app"}
                </Text>
              </View>
              <View style={styles.verifiedPill}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={colors.accentDeep}
                />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <Stat value={`${ridesTaken}`} label="Rides taken" />
              <Stat value={`${uniqueRoutes}`} label="Saved routes" />
              <Stat value="18" label="Pass rides" />
            </View>

            <Section title="Travel">
              <Row icon="card-outline" label="Shuttle pass" hint="Active · 18 left" />
              <Row icon="wallet-outline" label="Preferred payment" hint="UPI" />
              <Row icon="map-outline" label="Saved route" hint="Set up" last />
            </Section>

            <Section title="App">
              <Row icon="notifications-outline" label="Notifications" hint="On" />
              <Row icon="shield-outline" label="Privacy policy" />
              <Row icon="document-text-outline" label="Terms of service" />
              <Row
                icon="information-circle-outline"
                label="App version"
                hint="1.0.0"
                last
              />
            </Section>

            <Section title="Account">
              <Row
                icon="log-out-outline"
                label="Log out"
                danger
                onPress={promptLogout}
                last
              />
            </Section>

            <Text style={styles.footer}>
              Mobilo · Junction-first transit
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  hint,
  danger,
  last,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[rowStyles.row, last && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !hint}
    >
      <View
        style={[
          rowStyles.icon,
          danger && { backgroundColor: colors.dangerSoft },
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={danger ? colors.danger : colors.ink}
        />
      </View>
      <Text
        style={[
          rowStyles.label,
          danger && { color: colors.danger, fontWeight: "800" },
        ]}
      >
        {label}
      </Text>
      {hint ? (
        <Text style={rowStyles.hint}>{hint}</Text>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={danger ? colors.danger : colors.inkFaint}
        />
      )}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  label: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  hint: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8,
  },
});

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  handle: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifiedText: {
    color: colors.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  footer: {
    textAlign: "center",
    marginTop: 24,
    color: colors.inkFaint,
    fontSize: 12,
    fontWeight: "700",
  },
});
