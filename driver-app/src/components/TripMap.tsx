import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { colors, radii, shadows } from "../theme";

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  kind: "driver" | "pickup" | "drop";
}

interface Props {
  points: MapPoint[];
  height?: number;
  style?: ViewStyle;
}

// Safe wrapper around the native map, mirroring the rider app's approach.
//
// react-native-maps can crash the whole app at first render in release
// builds (e.g. when the Google Maps API key isn't authorised, or Play
// Services is incompatible). We can't catch native init crashes from a JS
// error boundary, so we:
//   1. Lazy-require the implementation inside try/catch. If the import
//      itself throws, we never touch native code and the app stays alive.
//   2. Wrap the rendered map in an error boundary for render-time issues.
//   3. Fall back to a neutral placeholder if anything is off.

let TripMapImpl: React.ComponentType<Props> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  TripMapImpl = require("./TripMapImpl").default;
} catch (error) {
  if (typeof console !== "undefined") {
    console.warn(
      "react-native-maps unavailable, hiding driver map:",
      (error as Error)?.message
    );
  }
  TripMapImpl = null;
}

class MapErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    if (typeof console !== "undefined") {
      console.warn("Driver map render failed:", error?.message);
    }
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export default function TripMap(props: Props) {
  const height = props.height ?? 240;
  const fallback = (
    <View style={[styles.shell, { height }, props.style]} />
  );

  if (!TripMapImpl || props.points.length === 0) return fallback;

  return (
    <MapErrorBoundary fallback={fallback}>
      <TripMapImpl {...props} />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    ...shadows.soft,
  },
});
