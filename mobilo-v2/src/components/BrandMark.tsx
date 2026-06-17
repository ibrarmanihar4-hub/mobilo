import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { colors, shadows } from "../theme/theme";

interface Props {
  size?: "sm" | "md" | "lg";
}

// Brand logo rendered from the app's logo asset. The container is a wide
// rounded pill sized to the logo's wordmark proportions, with `contain` so
// the full logo text is always visible.
export default function BrandMark({ size = "md" }: Props) {
  const height = size === "lg" ? 56 : size === "sm" ? 38 : 46;
  const width = height * 2.44; // matches the logo's 1170x480 aspect ratio

  return (
    <View
      style={[
        styles.badge,
        { height, width, borderRadius: height * 0.3 },
      ]}
    >
      <Image
        source={require("../../assets/logo.jpg")}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Mobilo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 4,
    ...shadows.soft,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
