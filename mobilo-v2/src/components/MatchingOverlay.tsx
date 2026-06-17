// Full-screen "finding your driver" state shown while a trip is still
// `requested`. Animated pulsing radar around the ride icon makes the
// matching phase unmistakably distinct from the active-trip UI.

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radii } from "../theme/theme";

export default function MatchingOverlay({
  icon,
  rideTitle,
  elapsedSeconds,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  rideTitle: string;
  elapsedSeconds: number;
}) {
  // Two staggered pulse rings expanding outward from the icon.
  const pulseA = useRef(new Animated.Value(0)).current;
  const pulseB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const make = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    const a = make(pulseA, 0);
    const b = make(pulseB, 1000);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [pulseA, pulseB]);

  const ring = (val: Animated.Value) => ({
    opacity: val.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0],
    }),
    transform: [
      {
        scale: val.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.8],
        }),
      },
    ],
  });

  const mm = Math.floor(elapsedSeconds / 60);
  const ss = elapsedSeconds % 60;
  const elapsedLabel = `${mm}:${ss.toString().padStart(2, "0")}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.pulseStage}>
        <Animated.View style={[styles.pulseRing, ring(pulseA)]} />
        <Animated.View style={[styles.pulseRing, ring(pulseB)]} />
        <View style={styles.iconCore}>
          <MaterialCommunityIcons name={icon} size={34} color="#FFFFFF" />
        </View>
      </View>

      <Text style={styles.title}>Finding your {rideTitle.toLowerCase()}</Text>
      <Text style={styles.sub}>
        Matching you with the nearest available driver
      </Text>

      <View style={styles.timerPill}>
        <View style={styles.dot} />
        <Text style={styles.timerText}>Searching · {elapsedLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  pulseStage: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  pulseRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  iconCore: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  sub: {
    color: colors.inkMuted,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginRight: 4,
  },
  timerText: {
    color: colors.inkSoft,
    fontSize: 13,
    fontWeight: "800",
  },
});
