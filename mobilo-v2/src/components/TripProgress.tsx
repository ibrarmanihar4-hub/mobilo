// Horizontal phase stepper for an active trip so the rider can always see
// exactly where things are: Assigned → Arriving → On trip → Completed.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme/theme";

export type TripPhase = "assigned" | "arriving" | "ongoing" | "completed";

const STEPS: { key: TripPhase; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "assigned", label: "Matched", icon: "checkmark-circle" },
  { key: "arriving", label: "Arriving", icon: "navigate" },
  { key: "ongoing", label: "On trip", icon: "car" },
  { key: "completed", label: "Done", icon: "flag" },
];

const ORDER: Record<TripPhase, number> = {
  assigned: 0,
  arriving: 1,
  ongoing: 2,
  completed: 3,
};

export default function TripProgress({ phase }: { phase: TripPhase }) {
  const current = ORDER[phase];

  return (
    <View style={styles.wrap}>
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const reached = done || active;
        return (
          <React.Fragment key={step.key}>
            <View style={styles.step}>
              <View
                style={[
                  styles.node,
                  reached && styles.nodeReached,
                  active && styles.nodeActive,
                ]}
              >
                <Ionicons
                  name={done ? "checkmark" : step.icon}
                  size={14}
                  color={reached ? "#FFFFFF" : colors.inkFaint}
                />
              </View>
              <Text
                style={[styles.label, reached && styles.labelReached]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>
            {index < STEPS.length - 1 ? (
              <View
                style={[styles.connector, index < current && styles.connectorDone]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 4,
  },
  step: { alignItems: "center", width: 64 },
  node: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeReached: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  nodeActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkFaint,
    marginTop: 6,
  },
  labelReached: { color: colors.ink, fontWeight: "800" },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginTop: 16,
    borderRadius: 2,
  },
  connectorDone: { backgroundColor: colors.accent },
});
