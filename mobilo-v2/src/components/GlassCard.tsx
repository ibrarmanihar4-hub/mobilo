import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../theme/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
  /** kept for API compatibility; ignored visually now */
  glow?: boolean;
}

// Flat white card with a hairline border and a tiny shadow. The standard
// mobility-app card.
export default function GlassCard({
  children,
  style,
  padding = 16,
}: Props) {
  return (
    <View style={[styles.shell, style as ViewStyle]}>
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadows.soft,
  },
});
