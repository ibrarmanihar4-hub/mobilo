import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii } from "../theme/theme";

type Variant = "gradient" | "ghost" | "solid" | "danger";

interface Props {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  trailing?: string;
  variant?: Variant;
  style?: ViewStyle;
}

// Solid black primary button (industry standard). Ghost = bordered white.
// "gradient" name is preserved so older imports keep working.
export default function GradientButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  trailing,
  variant = "gradient",
  style,
}: Props) {
  const isDisabled = disabled || loading;

  let bg = colors.primary;
  let fg = "#FFFFFF";
  let borderColor: string | undefined;
  let borderWidth = 0;

  if (variant === "ghost") {
    bg = colors.surface;
    fg = colors.ink;
    borderColor = colors.border;
    borderWidth = 1;
  } else if (variant === "solid") {
    bg = colors.surfaceMuted;
    fg = colors.ink;
  } else if (variant === "danger") {
    bg = colors.danger;
    fg = "#FFFFFF";
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: borderColor || "transparent",
          borderWidth,
          opacity: isDisabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={fg}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={fg}
              style={{ marginLeft: 10 }}
            />
          ) : null}
        </View>
        {trailing ? (
          <Text style={[styles.trailing, { color: fg }]}>{trailing}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 56,
    borderRadius: radii.md,
    paddingHorizontal: 22,
    paddingVertical: 16,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center" },
  label: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  trailing: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.9,
  },
});
