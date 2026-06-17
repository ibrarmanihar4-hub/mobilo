import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/theme";

interface Props {
  title: string;
  subtitle?: string;
  step?: number;
  total?: number;
  showBack?: boolean;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  style?: ViewStyle;
}

export default function ScreenHeader({
  title,
  subtitle,
  step,
  total = 3,
  showBack = true,
  onBack,
  rightLabel,
  onRightPress,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (onBack) onBack();
    else if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }, style]}>
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iconBtn}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}

        {step ? (
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, i) => {
              const filled = i + 1 <= step;
              return (
                <View
                  key={i}
                  style={[styles.dot, filled && styles.dotFilled]}
                />
              );
            })}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        {rightLabel ? (
          <TouchableOpacity onPress={onRightPress} activeOpacity={0.85}>
            <Text style={styles.right}>{rightLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 22,
    paddingBottom: 16,
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 24,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  dotFilled: { backgroundColor: colors.primary },
  right: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 32,
  },
  subtitle: {
    color: colors.inkMuted,
    marginTop: 4,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
});
