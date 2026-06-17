import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";

import { colors, radii } from "../theme/theme";

type HelpAction = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel: string;
  onPress: () => void;
};

type HelpTopic = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

const faqTopics: HelpTopic[] = [
  {
    id: "pickup",
    icon: "navigate-circle-outline",
    title: "Pickup & driver arrival",
    description:
      "See where to wait, when to call the driver, and how pickup timing works.",
  },
  {
    id: "payment",
    icon: "wallet-outline",
    title: "Payments & refunds",
    description:
      "Understand UPI, card, wallet, and cash flows for shuttle and direct rides.",
  },
  {
    id: "cancel",
    icon: "close-circle-outline",
    title: "Cancellation policy",
    description:
      "Review cancellation windows and what happens if a rider or driver does not arrive.",
  },
  {
    id: "safety",
    icon: "shield-checkmark-outline",
    title: "Safety tools",
    description:
      "Use ride verification, OTP checks, and trip-sharing best practices.",
  },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();

  const helpActions: HelpAction[] = [
    {
      id: "call",
      icon: "call-outline",
      title: "Call support",
      subtitle: "Speak to the Mobilo support desk for urgent issues.",
      actionLabel: "+91 1800 123 9900",
      onPress: () => Linking.openURL("tel:+9118001239900"),
    },
    {
      id: "mail",
      icon: "mail-outline",
      title: "Email support",
      subtitle: "Send ride, payment, or account questions to our inbox.",
      actionLabel: "support@mobilo.app",
      onPress: () =>
        Linking.openURL(
          "mailto:support@mobilo.app?subject=Mobilo%20Support%20Request"
        ),
    },
    {
      id: "safety",
      icon: "warning-outline",
      title: "Emergency help",
      subtitle: "Use this option if you need immediate assistance.",
      actionLabel: "112 emergency",
      onPress: () => Linking.openURL("tel:112"),
    },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          title="Help"
          subtitle="Support for bookings, payments, and safety."
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Ionicons name="help-buoy" size={22} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>We've got your back.</Text>
                <Text style={styles.heroSub}>
                  Get help fast for bookings, payments, and pickup.
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>24/7</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Contact support</Text>
            <View style={styles.actionsList}>
              {helpActions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={item.onPress}
                  style={styles.actionCard}
                >
                  <View style={styles.actionIcon}>
                    <Ionicons name={item.icon} size={18} color={colors.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>{item.title}</Text>
                    <Text style={styles.actionSub}>{item.subtitle}</Text>
                    <Text style={styles.actionLink}>{item.actionLabel}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.inkFaint}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Help topics</Text>
            <View style={styles.topicsCard}>
              {faqTopics.map((topic, idx) => (
                <View
                  key={topic.id}
                  style={[
                    styles.topicRow,
                    idx === faqTopics.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                >
                  <View style={styles.topicIcon}>
                    <Ionicons
                      name={topic.icon}
                      size={16}
                      color={colors.ink}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicDesc}>{topic.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Safety</Text>
            <View style={styles.safetyCard}>
              <View style={styles.safetyHeadRow}>
                <View style={styles.safetyIcon}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={styles.safetyTitle}>Verify your ride</Text>
              </View>
              <Text style={styles.safetyText}>
                Match the driver name, vehicle plate, and OTP shown in the app
                before starting the trip.
              </Text>
              <View style={styles.checklist}>
                <Check label="Check the vehicle plate" />
                <Check label="Verify the driver name" />
                <Check label="Share the trip OTP only at pickup" />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Check({ label }: { label: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name="checkmark-circle"
        size={14}
        color="rgba(255,255,255,0.85)"
      />
      <Text style={styles.checkText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  heroSub: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  heroBadge: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  sectionTitle: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
    marginLeft: 4,
  },
  actionsList: { gap: 10, marginBottom: 18 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  actionSub: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 17,
  },
  actionLink: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  topicsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 18,
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  topicIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  topicTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  topicDesc: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    lineHeight: 17,
  },
  safetyCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    padding: 18,
  },
  safetyHeadRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  safetyIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  safetyTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  safetyText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
    fontWeight: "600",
  },
  checklist: {
    marginTop: 12,
    gap: 8,
  },
  checkRow: { flexDirection: "row", alignItems: "center" },
  checkText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
  },
});
