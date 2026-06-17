import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import ScreenBackground from "../components/ScreenBackground";
import ScreenHeader from "../components/ScreenHeader";
import GradientButton from "../components/GradientButton";

import { RootStackParamList } from "../navigation/RootNavigator";
import { colors, radii, shadows } from "../theme/theme";
import {
  buildDepartureKey,
  fetchReservedSeats,
  reserveSeats,
  subscribeToSeats,
} from "../services/seatsRepo";

type ShuttleSeatRouteProp = RouteProp<RootStackParamList, "ShuttleSeat">;

const TOTAL_SEATS = 18;

// Bus layout: rows of 3 seats split 2 + aisle + 1, like a typical shuttle
// / minibus seat map (RedBus style).
const LEFT_COLS = 2;
const RIGHT_COLS = 1;
const SEATS_PER_ROW = LEFT_COLS + RIGHT_COLS;

type SeatState = "available" | "selected" | "booked";

export default function ShuttleSeatScreen() {
  const route = useRoute<ShuttleSeatRouteProp>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const { departureTime, departureEpoch, pickupNode, dropNode, routePlan, fare } =
    route.params;
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [reservedSeats, setReservedSeats] = useState<number[]>([]);
  const [reserving, setReserving] = useState(false);

  // Real seat inventory: load the seats already taken for this exact
  // departure and keep it live so two riders can't grab the same seat.
  const departureKey = useMemo(
    () => buildDepartureKey(routePlan.route.id, departureEpoch),
    [routePlan.route.id, departureEpoch]
  );

  useEffect(() => {
    let active = true;
    void fetchReservedSeats(departureKey).then((seats) => {
      if (active) setReservedSeats(seats);
    });
    const unsubscribe = subscribeToSeats(departureKey, (seats) => {
      if (active) setReservedSeats(seats);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [departureKey]);

  const reservedSet = useMemo(() => new Set(reservedSeats), [reservedSeats]);

  const toggleSeat = (seat: number) => {
    if (reservedSet.has(seat)) return;
    setSelectedSeats((cur) =>
      cur.includes(seat)
        ? cur.filter((s) => s !== seat)
        : [...cur, seat].sort((a, b) => a - b)
    );
  };

  const totalFare = fare * Math.max(selectedSeats.length, 0);

  const seatRows = useMemo(() => {
    const rows: number[][] = [];
    for (let seat = 1; seat <= TOTAL_SEATS; seat += SEATS_PER_ROW) {
      const row: number[] = [];
      for (let i = 0; i < SEATS_PER_ROW && seat + i <= TOTAL_SEATS; i++) {
        row.push(seat + i);
      }
      rows.push(row);
    }
    return rows;
  }, []);

  const pickRandom = () => {
    const available: number[] = [];
    for (let i = 1; i <= TOTAL_SEATS; i++) {
      if (!reservedSet.has(i)) available.push(i);
    }
    if (!available.length) return;
    const seat = available[Math.floor(Math.random() * available.length)];
    setSelectedSeats((cur) =>
      cur.includes(seat) ? cur : [...cur, seat].sort((a, b) => a - b)
    );
  };

  const proceedToPayment = async () => {
    if (selectedSeats.length === 0 || reserving) return;
    setReserving(true);
    const bookingCode = `SB${Math.floor(10000 + Math.random() * 90000)}`;

    // Atomically claim the seats before payment so nobody else can take
    // them. If someone beat us to one, refresh the map and let the rider
    // pick again.
    const result = await reserveSeats({
      departureKey,
      seatNumbers: selectedSeats,
      bookingCode,
    });

    if (!result.ok) {
      const fresh = await fetchReservedSeats(departureKey);
      setReservedSeats(fresh);
      setSelectedSeats((cur) => cur.filter((s) => !fresh.includes(s)));
      setReserving(false);
      Alert.alert("Seat unavailable", result.message);
      return;
    }

    setReserving(false);
    navigation.navigate("Payment", {
      intent: {
        kind: "shuttle",
        pickupNode,
        dropNode,
        routePlan,
        fare: totalFare,
        departureTime,
        departureKey,
        seatNumbers: selectedSeats,
        bookingCode,
      },
    });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScreenHeader
          step={3}
          title="Choose a seat"
          subtitle={`Departure ${departureTime} · ${routePlan.route.name}`}
          rightLabel="Random"
          onRightPress={pickRandom}
        />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 130 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Trip card */}
            <View style={styles.tripCard}>
              <Text style={styles.tripLabel}>DEPARTURE</Text>
              <Text style={styles.tripValue}>{departureTime}</Text>
              <View style={styles.metaRow}>
                <Meta label="Boarding" value={pickupNode.stop.pointLabel} />
                <Meta label="Destination" value={dropNode.pointLabel} />
                <Meta label="Fare" value={`₹${fare}`} />
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <Legend color={colors.surface} border label="Available" />
              <Legend color={colors.ink} label="Selected" />
              <Legend color={colors.surfaceMuted} border label="Booked" />
            </View>

            {/* Bus cabin */}
            <View style={styles.cabin}>
              {/* Driver / front of bus */}
              <View style={styles.busFront}>
                <View style={styles.steering}>
                  <Ionicons
                    name="disc-outline"
                    size={20}
                    color={colors.inkMuted}
                  />
                </View>
                <View style={styles.doorTag}>
                  <Ionicons
                    name="enter-outline"
                    size={12}
                    color={colors.inkMuted}
                  />
                  <Text style={styles.doorText}>Door</Text>
                </View>
              </View>

              <View style={styles.deck}>
                {seatRows.map((row, rowIndex) => (
                  <View key={`row-${rowIndex}`} style={styles.deckRow}>
                    <View style={styles.seatCluster}>
                      {row.slice(0, LEFT_COLS).map((seat) => (
                        <Seat
                          key={seat}
                          seat={seat}
                          state={
                            selectedSeats.includes(seat)
                              ? "selected"
                              : reservedSet.has(seat)
                              ? "booked"
                              : "available"
                          }
                          onPress={() => toggleSeat(seat)}
                        />
                      ))}
                    </View>

                    <View style={styles.aisle} />

                    <View style={styles.seatCluster}>
                      {row.slice(LEFT_COLS).map((seat) => (
                        <Seat
                          key={seat}
                          seat={seat}
                          state={
                            selectedSeats.includes(seat)
                              ? "selected"
                              : reservedSet.has(seat)
                              ? "booked"
                              : "available"
                          }
                          onPress={() => toggleSeat(seat)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {selectedSeats.length > 0 ? (
          <View
            style={[
              styles.cta,
              { paddingBottom: Math.max(insets.bottom, 12) + 8 },
            ]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.ctaLabel}>
                {selectedSeats.length === 1 ? "SEAT" : "SEATS"}{" "}
                {selectedSeats.join(", ")}
              </Text>
              <Text style={styles.ctaFare}>
                ₹{totalFare}
                <Text style={styles.ctaFareSub}>
                  {selectedSeats.length > 1
                    ? `  ·  ${selectedSeats.length} × ₹${fare}`
                    : ""}
                </Text>
              </Text>
            </View>
            <GradientButton
              label={reserving ? "Reserving" : "Continue"}
              icon="arrow-forward"
              loading={reserving}
              onPress={proceedToPayment}
              style={{ flex: 1, marginLeft: 16 }}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Seat({
  seat,
  state,
  onPress,
}: {
  seat: number;
  state: SeatState;
  onPress: () => void;
}) {
  const isSelected = state === "selected";
  const isBooked = state === "booked";

  return (
    <TouchableOpacity
      disabled={isBooked}
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.seat}
    >
      {/* Left armrest */}
      <View
        style={[
          styles.armrest,
          isSelected && styles.armrestSelected,
          isBooked && styles.armrestBooked,
        ]}
      />
      {/* Seat cushion with number */}
      <View
        style={[
          styles.seatPad,
          isSelected && styles.seatPadSelected,
          isBooked && styles.seatPadBooked,
        ]}
      >
        {isBooked ? (
          <Ionicons name="close" size={16} color={colors.inkFaint} />
        ) : (
          <Text
            style={[styles.seatN, isSelected && styles.seatNSelected]}
          >
            {seat}
          </Text>
        )}
      </View>
      {/* Right armrest */}
      <View
        style={[
          styles.armrest,
          isSelected && styles.armrestSelected,
          isBooked && styles.armrestBooked,
        ]}
      />
    </TouchableOpacity>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Legend({
  color,
  label,
  border,
}: {
  color: string;
  label: string;
  border?: boolean;
}) {
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          styles.legendSwatch,
          { backgroundColor: color },
          border && { borderWidth: 1, borderColor: colors.border },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  content: { paddingHorizontal: 22, gap: 14 },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tripValue: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  meta: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  metaLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metaValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingVertical: 4,
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  cabin: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  busFront: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    marginBottom: 18,
  },
  steering: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  doorTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  doorText: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginLeft: 2,
  },
  deck: { gap: 14 },
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  seatCluster: {
    flexDirection: "row",
    gap: 12,
  },
  aisle: { flex: 1, minWidth: 24 },

  // A seat rendered RedBus-style: a rounded cushion flanked by two thin
  // armrests. Selected = filled black, booked = muted with an X.
  seat: {
    flexDirection: "row",
    alignItems: "center",
  },
  armrest: {
    width: 5,
    height: 28,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  armrestSelected: { backgroundColor: colors.ink },
  armrestBooked: { backgroundColor: colors.surfaceHigh },
  seatPad: {
    width: 40,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 1,
  },
  seatPadSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  seatPadBooked: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  seatN: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  seatNSelected: { color: "#FFFFFF" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.floating,
  },
  ctaLabel: {
    color: colors.inkMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  ctaFare: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  ctaFareSub: {
    color: colors.inkMuted,
    fontSize: 12,
    fontWeight: "700",
  },
});
