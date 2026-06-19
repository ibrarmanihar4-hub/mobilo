import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useLocationBroadcast } from "../hooks/useLocationBroadcast";
import {
  acceptOffer,
  fetchActiveTrip,
  fetchMyOffers,
  rejectOffer,
  setDriverStatus,
  subscribeToMyOffers,
  type OfferWithTrip,
} from "../services/driverRepo";
import type { DriverRow, TripRow } from "../types";
import { colors, radii, shadows } from "../theme";

/** Seconds remaining until an offer expires, clamped at 0. */
function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

export default function HomeScreen({
  driver,
  onOpenTrip,
  onLogout,
}: {
  driver: DriverRow;
  onOpenTrip: (trip: TripRow) => void;
  onLogout: () => void;
}) {
  const { logout } = useAuth();
  const [online, setOnline] = useState(driver.status !== "offline");
  const [offers, setOffers] = useState<OfferWithTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  // Drives a 1s re-render so the countdown labels tick down.
  const [, setTick] = useState(0);

  // Local arrival time per offer, keyed by offer id + offered_at so a
  // re-offer (same row, new offered_at) gets a fresh countdown. This makes the
  // countdown immune to clock skew between the phone and the server: we only
  // use server timestamps for the TTL *duration*, and the device clock for
  // elapsed time since the offer arrived.
  const seenAtRef = useRef<Record<string, number>>({});

  const remainingSeconds = useCallback(
    (offer: OfferWithTrip["offer"]): number => {
      const ttlMs =
        new Date(offer.expires_at).getTime() -
        new Date(offer.offered_at).getTime();
      // Fallback to server-clock math if timestamps look wrong.
      if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
        return secondsLeft(offer.expires_at);
      }
      const key = `${offer.id}:${offer.offered_at}`;
      const now = Date.now();
      if (!seenAtRef.current[key]) seenAtRef.current[key] = now;
      const elapsed = now - seenAtRef.current[key];
      return Math.max(0, Math.round((ttlMs - elapsed) / 1000));
    },
    []
  );

  // Broadcast live location while online.
  useLocationBroadcast(online);

  const loadOffers = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const mine = await fetchMyOffers();
      setOffers(mine);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Resume an in-progress trip if the app restarted mid-ride.
  useEffect(() => {
    void fetchActiveTrip().then((t) => {
      if (t) onOpenTrip(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live updates to this driver's offers while online.
  useEffect(() => {
    if (!online) {
      setOffers([]);
      setLoading(false);
      return;
    }

    // Initial load with loading indicator
    void loadOffers(true);

    // Subscribe to real-time changes - refetch silently on any offer change
    const unsub = subscribeToMyOffers(driver.id, () => {
      void loadOffers(false);
    });

    // When app comes back to foreground, re-fetch offers immediately
    // because the Realtime subscription may have missed events while backgrounded
    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadOffers(false);
      }
    });

    return () => {
      unsub();
      appStateSub.remove();
    };
  }, [online, driver.id, loadOffers]);

  // Tick every second to update countdowns; prune expired offers immediately.
  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => {
      setOffers((prev) => {
        // Remove offers whose local countdown has hit zero.
        const live = prev.filter((o) => remainingSeconds(o.offer) > 0);
        // Always update tick to re-render countdowns.
        setTick((t) => t + 1);
        return live;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [online, remainingSeconds]);

  const toggleOnline = async (next: boolean) => {
    setOnline(next);
    await setDriverStatus(next ? "online" : "offline");
  };

  const handleAccept = async (item: OfferWithTrip) => {
    setResponding(item.offer.id);
    const claimed = await acceptOffer(item.offer.id, item.trip.id);
    setResponding(null);
    if (claimed) {
      onOpenTrip(claimed);
    } else {
      Alert.alert(
        "Offer expired",
        "This ride is no longer available. You'll get the next one."
      );
      void loadOffers();
    }
  };

  const handleReject = async (item: OfferWithTrip) => {
    setResponding(item.offer.id);
    await rejectOffer(item.offer.id);
    setResponding(null);
    setOffers((prev) => prev.filter((o) => o.offer.id !== item.offer.id));
  };

  // Render-time guard: never show offers that are already expired, even if the
  // 1s prune interval hasn't fired yet or a fetch returned a near-expiry offer.
  // `setTick` (driven by the interval above) re-renders this each second.
  const visibleOffers = offers.filter((o) => remainingSeconds(o.offer) > 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Hi {driver.full_name.split(" ")[0]}</Text>
          <Text style={styles.vehicle}>
            {driver.vehicle_label} · {driver.vehicle_plate}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            void logout();
            onLogout();
          }}
          style={styles.logout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.inkMuted} />
        </TouchableOpacity>
      </View>

      {/* Online toggle */}
      <View style={[styles.statusCard, online && styles.statusCardOnline]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, online && { color: "#FFFFFF" }]}>
            {online ? "You're online" : "You're offline"}
          </Text>
          <Text
            style={[
              styles.statusSub,
              online && { color: "rgba(255,255,255,0.8)" },
            ]}
          >
            {online
              ? "We'll send you the nearest ride requests"
              : "Go online to start earning"}
          </Text>
        </View>
        <Switch
          value={online}
          onValueChange={toggleOnline}
          trackColor={{ false: colors.border, true: "#FFFFFF" }}
          thumbColor={online ? colors.accent : colors.inkFaint}
        />
      </View>

      <View style={styles.listHead}>
        <Text style={styles.listTitle}>Ride offers</Text>
        {loading ? <ActivityIndicator size="small" color={colors.inkMuted} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadOffers} />
        }
      >
        {!online ? (
          <Empty icon="power" text="Go online to receive ride offers." />
        ) : visibleOffers.length === 0 ? (
          <Empty icon="time-outline" text="No offers yet. Hang tight." />
        ) : (
          visibleOffers.map((item) => {
            const left = remainingSeconds(item.offer);
            const distanceKm =
              item.offer.distance_m != null
                ? (item.offer.distance_m / 1000).toFixed(1)
                : null;
            const isResponding = responding === item.offer.id;
            // Lock out accept in the final second to avoid accepting an offer
            // the server has already expired (also covers minor clock skew).
            const isExpiring = left <= 1;
            return (
              <View key={item.offer.id} style={styles.tripCard}>
                <View style={styles.tripTop}>
                  <Text style={styles.fare}>₹{item.trip.fare}</Text>
                  <View style={styles.countdownPill}>
                    <Ionicons name="time" size={12} color={colors.danger} />
                    <Text style={styles.countdownText}>{left}s</Text>
                  </View>
                </View>
                {distanceKm ? (
                  <Text style={styles.distance}>{distanceKm} km to pickup</Text>
                ) : null}
                <Leg
                  icon="ellipse"
                  color={colors.ink}
                  label="Pickup"
                  value={item.trip.pickup_name}
                />
                <Leg
                  icon="location"
                  color={colors.danger}
                  label="Drop"
                  value={item.trip.drop_name}
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.reject}
                    onPress={() => handleReject(item)}
                    disabled={isResponding}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.rejectText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.accept, isExpiring && styles.acceptDisabled]}
                    onPress={() => handleAccept(item)}
                    disabled={isResponding || isExpiring}
                    activeOpacity={0.85}
                  >
                    {isResponding ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.acceptText}>
                        {isExpiring ? "Expiring…" : "Accept"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Leg({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.leg}>
      <Ionicons name={icon} size={12} color={color} style={{ marginTop: 3 }} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.legLabel}>{label}</Text>
        <Text style={styles.legValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function Empty({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={colors.inkFaint} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  hello: { fontSize: 22, fontWeight: "800", color: colors.ink },
  vehicle: { fontSize: 13, fontWeight: "600", color: colors.inkMuted, marginTop: 2 },
  logout: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCard: {
    marginHorizontal: 22,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.soft,
  },
  statusCardOnline: { backgroundColor: colors.accent, borderColor: colors.accent },
  statusTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  statusSub: { fontSize: 12, fontWeight: "600", color: colors.inkMuted, marginTop: 3 },
  listHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginTop: 22,
    marginBottom: 10,
  },
  listTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  scroll: { paddingHorizontal: 22, paddingBottom: 32 },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    ...shadows.soft,
  },
  tripTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  fare: { fontSize: 20, fontWeight: "800", color: colors.ink },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  countdownText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 2,
  },
  distance: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    marginBottom: 12,
  },
  leg: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  legLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.inkMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  legValue: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 1 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  reject: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rejectText: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  accept: {
    flex: 2,
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
  },
  acceptText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  acceptDisabled: { backgroundColor: colors.inkFaint, opacity: 0.6 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
});
