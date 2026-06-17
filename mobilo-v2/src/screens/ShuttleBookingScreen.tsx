import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";
import RouteMap, { RouteMapStop } from "../components/RouteMap";

import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radii, shadows } from "../theme/theme";
import { getLayoutMetrics } from "../utils/responsive";

type ShuttleRouteProp = RouteProp<RootStackParamList, "ShuttleBooking">;

interface Departure {
  id: string;
  time: string;
  total: number;
  booked: number;
  epoch: number;
}

function generateSchedule(): Departure[] {
  const now = new Date();
  const minutes = now.getMinutes();
  const remainder = minutes % 30;
  if (remainder !== 0) {
    now.setMinutes(minutes + (30 - remainder));
  }
  now.setSeconds(0);
  now.setMilliseconds(0);
  const slots: Departure[] = [];
  for (let i = 0; i < 6; i++) {
    const slotTime = new Date(now.getTime() + i * 30 * 60000);
    slots.push({
      id: `${i}`,
      time: slotTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      epoch: slotTime.getTime(),
      total: 18,
      booked: Math.floor(Math.random() * 18),
    });
  }
  return slots;
}

export default function ShuttleBookingScreen() {
  const route = useRoute<ShuttleRouteProp>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const layout = getLayoutMetrics(width, height);
  const isCompact = layout.isCompactWidth || layout.isCompactHeight;

  const { pickupNode, dropNode, routePlan } = route.params;

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [selected, setSelected] = useState<Departure | null>(null);

  const hasPass = false;
  const price = hasPass ? 29 : 49;
  const pickupWalkMeters = Math.round(pickupNode.distance);
  const pickupWalkTime = pickupNode.walkMinutes;
  const shuttleRideTime = routePlan.estimatedRideMinutes;

  const mapHeight = layout.isTablet
    ? Math.min(Math.max(height * 0.28, 240), 320)
    : Math.min(Math.max(height * 0.24, 200), isCompact ? 220 : 240);

  useEffect(() => {
    setDepartures(generateSchedule());
  }, []);

  const mapStops: RouteMapStop[] = [
    {
      id: pickupNode.stop.id,
      name: pickupNode.stop.name,
      latitude: pickupNode.stop.latitude,
      longitude: pickupNode.stop.longitude,
      highlight: "pickup",
    },
    ...routePlan.coveredStops
      .filter((s) => s.id !== pickupNode.stop.id && s.id !== dropNode.id)
      .map(
        (s) =>
          ({
            id: s.id,
            name: s.name,
            latitude: s.latitude,
            longitude: s.longitude,
            highlight: "via",
          } satisfies RouteMapStop)
      ),
    {
      id: dropNode.id,
      name: dropNode.name,
      latitude: dropNode.latitude,
      longitude: dropNode.longitude,
      highlight: "dest",
    },
  ];

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          step={3}
          title="Pick a departure"
          subtitle={`${routePlan.route.name} · ${routePlan.route.direction}`}
        />

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.content,
              {
                maxWidth: layout.contentMaxWidth,
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            <RouteMap
              stops={mapStops}
              polylineStops={routePlan.coveredStops.map((s) => ({
                id: s.id,
                name: s.name,
                latitude: s.latitude,
                longitude: s.longitude,
              }))}
              height={mapHeight}
              badge={`${shuttleRideTime} min`}
            />

            <View style={styles.statsRow}>
              <Stat
                label="Walk"
                value={`${pickupWalkTime} min`}
                meta={`${pickupWalkMeters} m`}
              />
              <Stat
                label="Ride"
                value={`${shuttleRideTime} min`}
                meta="on route"
              />
              <Stat
                label="Stops"
                value={`${routePlan.coveredStops.length}`}
                meta="covered"
              />
            </View>

            <Text style={styles.sectionEyebrow}>NEXT DEPARTURES</Text>

            <View style={styles.slotList}>
              {departures.map((item) => {
                const seatsLeft = item.total - item.booked;
                const isFull = seatsLeft <= 0;
                const isLow = seatsLeft <= 3 && !isFull;
                const isSelected = selected?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    disabled={isFull}
                    onPress={() => setSelected(item)}
                    activeOpacity={0.85}
                    style={[
                      styles.slotCard,
                      isSelected && styles.slotCardSelected,
                      isFull && styles.slotDisabled,
                    ]}
                  >
                    <View>
                      <Text style={styles.slotTime}>{item.time}</Text>
                      <Text style={styles.slotMeta}>Every 30 min</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          styles.slotSeats,
                          isFull && styles.slotFull,
                          isLow && styles.slotLow,
                        ]}
                      >
                        {isFull ? "Full" : `${seatsLeft} seats left`}
                      </Text>
                      <Text style={styles.slotPrice}>₹{price}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <View
            style={[
              styles.footerInner,
              { maxWidth: layout.contentMaxWidth },
            ]}
          >
            <View>
              <Text style={styles.footerLabel}>SELECTED</Text>
              <Text style={styles.footerValue}>
                {selected ? selected.time : "Choose a slot"}
              </Text>
            </View>
            <GradientButton
              label={selected ? `Reserve ${selected.time}` : "Pick a slot"}
              icon="arrow-forward"
              disabled={!selected}
              onPress={() =>
                navigation.navigate("ShuttleSeat", {
                  departureTime: selected?.time || "",
                  departureEpoch: selected?.epoch || Date.now(),
                  pickupNode,
                  dropNode,
                  routePlan,
                  fare: price,
                })
              }
              style={{ flex: 1, marginLeft: 16 }}
            />
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Stat({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statMeta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  statMeta: {
    color: colors.inkMuted,
    fontSize: 11,
    marginTop: 2,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 1,
    marginTop: 22,
    marginBottom: 10,
  },
  slotList: { gap: 10 },
  slotCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  slotCardSelected: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  slotDisabled: { opacity: 0.4 },
  slotTime: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  slotMeta: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  slotSeats: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  slotFull: { color: colors.danger },
  slotLow: { color: colors.warning },
  slotPrice: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 22,
    ...shadows.floating,
  },
  footerInner: {
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  footerValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
});
