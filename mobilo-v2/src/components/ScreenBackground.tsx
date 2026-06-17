import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../theme/theme";

interface Props {
  children: React.ReactNode;
}

// Flat soft-gray background. The Uber/Bolt look.
export default function ScreenBackground({ children }: Props) {
  return <View style={styles.root}>{children}</View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
