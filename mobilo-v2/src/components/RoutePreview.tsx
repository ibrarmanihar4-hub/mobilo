import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme/theme";

interface Stop {
  id: string;
  name: string;
  highlight?: "pickup" | "drop" | "via" | "source" | "dest";
}

interface Props {
  stops: Stop[];
  height?: number;
  style?: ViewStyle;
  walkLabel?: string;
}

function dedupeById(stops: Stop[]): Stop[] {
  const seen = new Set<string>();
  const out: Stop[] = [];
  for (const stop of stops) {
    if (seen.has(stop.id)) continue;
    seen.add(stop.id);
    out.push(stop);
  }
  return out;
}

// A clean text-only "route preview" that replaces the Google Map view.
// We deliberately avoid native maps because the Google Maps SDK crashes
// the whole app when the key isn't authorized for the release keystore.
// This visualisation is also faster to render and works offline.
export default function RoutePreview({
  stops,
  height,
  style,
  walkLabel,
}: Props) {
  return (
    <View
      style={[
        styles.shell,
        height ? { minHeight: height } : null,
        style as ViewStyle,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="git-branch" size={14} color={colors.ink} />
          <Text style={styles.headerText}>Route preview</Text>
        </View>
        {walkLabel ? (
          <View style={styles.walkPill}>
            <Ionicons name="walk-outline" size={12} color={colors.ink} />
            <Text style={styles.walkText}>{walkLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.list}>
        {dedupeById(stops).map((stop, index, arr) => {
          const isLast = index === arr.length - 1;
          const dotColor =
            stop.highlight === "pickup" || stop.highlight === "source"
              ? colors.ink
              : stop.highlight === "drop" || stop.highlight === "dest"
              ? colors.hot
              : colors.inkFaint;
          const labelColor =
            stop.highlight && stop.highlight !== "via"
              ? colors.ink
              : colors.inkMuted;

          return (
            <View key={stop.id} style={styles.row}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: dotColor },
                    stop.highlight === "via" && styles.dotVia,
                  ]}
                />
                {!isLast ? <View style={styles.line} /> : null}
              </View>
              <Text
                style={[styles.name, { color: labelColor }]}
                numberOfLines={2}
              >
                {stop.name}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginLeft: 6,
  },
  walkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  walkText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
  },
  list: {
    paddingLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 32,
  },
  rail: {
    width: 18,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 4,
  },
  dotVia: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    paddingTop: 2,
    paddingBottom: 12,
    paddingLeft: 12,
  },
});
