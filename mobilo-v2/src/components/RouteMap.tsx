import React from "react";
import { ViewStyle } from "react-native";
import RoutePreview from "./RoutePreview";

export interface RouteMapStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  highlight?: "source" | "pickup" | "dest" | "via";
}

interface Props {
  stops: RouteMapStop[];
  walkPath?: { from: RouteMapStop; to: RouteMapStop } | null;
  polylineStops?: RouteMapStop[];
  height?: number;
  badge?: string;
  style?: ViewStyle;
}

// A safe wrapper around the native Google Maps view.
//
// Rationale: in some EAS release builds the native `react-native-maps`
// initialisation crashes the entire app at first render (e.g. when the
// Google Maps API key is not authorised for the EAS keystore SHA-1, or
// when the device's Google Play Services version is incompatible).
//
// We can't catch native init crashes from JS error boundaries, so we:
//   1. Lazy-require the implementation inside a try/catch. If the
//      `react-native-maps` import itself throws, we never touch any
//      native code and the app stays alive.
//   2. Wrap the rendered map in a JS error boundary so any render-time
//      issues fall back to a clean text route preview.
//   3. Default the entire feature to the RoutePreview if anything is off.

let RouteMapImpl: React.ComponentType<Props> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RouteMapImpl = require("./RouteMapImpl").default;
} catch (error) {
  if (typeof console !== "undefined") {
    console.warn(
      "react-native-maps unavailable, falling back to RoutePreview:",
      (error as Error)?.message
    );
  }
  RouteMapImpl = null;
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
      console.warn("Map render failed:", error?.message);
    }
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export default function RouteMap(props: Props) {
  const fallback = (
    <RoutePreview
      stops={dedupeById(props.stops).map((s) => ({
        id: s.id,
        name: s.name,
        highlight: s.highlight,
      }))}
      walkLabel={props.badge}
      style={props.style}
      height={props.height}
    />
  );

  if (!RouteMapImpl) return fallback;

  return (
    <MapErrorBoundary fallback={fallback}>
      <RouteMapImpl {...props} />
    </MapErrorBoundary>
  );
}
