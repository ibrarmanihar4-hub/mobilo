import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";

import { useBookingHistory } from "../context/BookingHistoryContext";
import { colors, radii } from "../theme/theme";

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { bookings, clearBookings } = useBookingHistory();

  const totalSpend = bookings.reduce((sum, item) => {
    const numericFare = Number(item.fare.replace(/[^0-9]/g, ""));
    return sum + numericFare;
  }, 0);
  const uniqueRoutes = new Set(bookings.map((item) => item.route)).size;

  const promptClear = () => {
    if (!bookings.length) return;
    Alert.alert(
      "Clear trip history?",
      "This removes all bookings from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearBookings(),
        },
      ]
    );
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          title="Trips"
          subtitle={
            bookings.length
              ? `${bookings.length} ride${bookings.length > 1 ? "s" : ""} on file`
              : "Your bookings will appear here"
          }
          rightLabel={bookings.length > 0 ? "Clear" : undefined}
          onRightPress={promptClear}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {bookings.length > 0 ? (
              <View style={styles.statsRow}>
                <Stat value={`${bookings.length}`} label="Trips" />
                <Stat value={`₹${totalSpend}`} label="Total spent" />
                <Stat value={`${uniqueRoutes}`} label="Saved routes" />
              </View>
            ) : null}

            {bookings.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="receipt-outline"
                    size={28}
                    color={colors.ink}
                  />
                </View>
                <Text style={styles.emptyTitle}>No trips yet</Text>
                <Text style={styles.emptyText}>
                  Once you book a shuttle or ride, your boarding details live
                  here.
                </Text>
                <GradientButton
                  label="Plan a ride"
                  icon="arrow-forward"
                  onPress={() => navigation.navigate("Home")}
                  style={{ marginTop: 16, alignSelf: "stretch" }}
                />
              </View>
            ) : (
              <View style={styles.list}>
                {bookings.map((item) => (
                  <View key={item.id} style={styles.card}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: colors.surfaceMuted },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={20}
                        color={colors.ink}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardFare}>{item.fare}</Text>
                      </View>
                      <Text style={styles.cardRoute} numberOfLines={2}>
                        {item.route}
                      </Text>
                      <View style={styles.cardMetaRow}>
                        <Text style={styles.cardTime}>{item.time}</Text>
                        <View style={styles.statusPill}>
                          <View style={styles.statusDot} />
                          <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
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

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 14,
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
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "600",
  },
  list: { gap: 12 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  cardFare: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  cardRoute: {
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontWeight: "600",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  cardTime: {
    color: colors.inkMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  statusText: {
    color: colors.accentDeep,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
});
