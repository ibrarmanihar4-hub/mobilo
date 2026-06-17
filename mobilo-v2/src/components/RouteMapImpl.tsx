import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { colors, mapStyleLight, radii, shadows } from "../theme/theme";
import { fetchDirections, LatLng } from "../services/directions";

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

function buildRegion(points: LatLng[]): Region {
  if (!points.length) {
    return {
      latitude: 16.6876,
      longitude: 74.232,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  return {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max(
      (Math.max(...lats) - Math.min(...lats)) * 1.8,
      0.02
    ),
    longitudeDelta: Math.max(
      (Math.max(...lngs) - Math.min(...lngs)) * 1.8,
      0.02
    ),
  };
}

function pinColor(highlight?: RouteMapStop["highlight"]): string {
  if (highlight === "source" || highlight === "pickup") return colors.ink;
  if (highlight === "dest") return colors.hot;
  return colors.inkFaint;
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

export default function RouteMapImpl({
  stops,
  walkPath,
  polylineStops,
  height = 220,
  badge,
  style,
}: Props) {
  const lineStops =
    polylineStops ?? stops.filter((s) => s.highlight !== "source");

  const polylineKey = lineStops
    .map((s) => `${s.latitude.toFixed(5)},${s.longitude.toFixed(5)}`)
    .join("|");
  const stopsKey = stops
    .map(
      (s) =>
        `${s.id}:${s.highlight ?? ""}:${s.latitude.toFixed(
          5
        )},${s.longitude.toFixed(5)}`
    )
    .join("|");
  const walkKey = walkPath
    ? `${walkPath.from.latitude.toFixed(5)},${walkPath.from.longitude.toFixed(
        5
      )}->${walkPath.to.latitude.toFixed(5)},${walkPath.to.longitude.toFixed(
        5
      )}`
    : "";

  const [roadPath, setRoadPath] = useState<LatLng[] | null>(null);
  const [walkRoadPath, setWalkRoadPath] = useState<LatLng[] | null>(null);
  const mapRef = useRef<MapView | null>(null);
  // react-native-maps snapshots custom marker views to a bitmap. If we
  // disable tracking before the view has laid out, the marker renders
  // blank. Keep tracking on briefly whenever the markers change, then turn
  // it off again so the map stays performant.
  const [trackMarkers, setTrackMarkers] = useState(true);

  useEffect(() => {
    setTrackMarkers(true);
    const timer = setTimeout(() => setTrackMarkers(false), 1500);
    return () => clearTimeout(timer);
  }, [stopsKey]);

  useEffect(() => {
    let cancelled = false;
    setRoadPath(null);
    if (lineStops.length < 2) return;
    const controller = new AbortController();
    fetchDirections(
      lineStops.map((s) => ({
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      { signal: controller.signal }
    )
      .then((result) => {
        if (!cancelled) setRoadPath(result?.path ?? null);
      })
      .catch(() => {
        if (!cancelled) setRoadPath(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polylineKey]);

  useEffect(() => {
    let cancelled = false;
    setWalkRoadPath(null);
    if (!walkPath) return;
    const controller = new AbortController();
    fetchDirections(
      [
        {
          latitude: walkPath.from.latitude,
          longitude: walkPath.from.longitude,
        },
        { latitude: walkPath.to.latitude, longitude: walkPath.to.longitude },
      ],
      { signal: controller.signal }
    )
      .then((result) => {
        if (!cancelled) setWalkRoadPath(result?.path ?? null);
      })
      .catch(() => {
        if (!cancelled) setWalkRoadPath(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walkKey]);

  const uniqueStops = dedupeById(stops);

  const allPoints: LatLng[] = uniqueStops.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
  }));  if (walkPath) {
    allPoints.push(
      { latitude: walkPath.from.latitude, longitude: walkPath.from.longitude },
      { latitude: walkPath.to.latitude, longitude: walkPath.to.longitude }
    );
  }
  if (roadPath) allPoints.push(...roadPath);
  const region = buildRegion(allPoints);

  // Auto-fit the map to show the whole route (source -> destination and
  // everything in between) whenever the relevant points change. This makes
  // the route appear automatically once both source and destination are
  // selected, without the user having to pan/zoom.
  const fitKey = allPoints
    .map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`)
    .join("|");

  useEffect(() => {
    const map = mapRef.current;
    if (!map || allPoints.length === 0) return;
    if (allPoints.length === 1) {
      map.animateToRegion(region, 350);
      return;
    }
    // Give the map a tick to lay out before fitting.
    const timer = setTimeout(() => {
      map.fitToCoordinates(allPoints, {
        edgePadding: {
          top: 60,
          right: 50,
          bottom: 60,
          left: 50,
        },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  const drivingCoords =
    roadPath && roadPath.length > 1
      ? roadPath
      : lineStops.map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
        }));

  const walkCoords =
    walkRoadPath && walkRoadPath.length > 1
      ? walkRoadPath
      : walkPath
      ? [
          {
            latitude: walkPath.from.latitude,
            longitude: walkPath.from.longitude,
          },
          { latitude: walkPath.to.latitude, longitude: walkPath.to.longitude },
        ]
      : null;

  return (
    <View style={[styles.shell, style as ViewStyle]}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height }]}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyleLight}
        initialRegion={region}
        onMapReady={() => {
          const map = mapRef.current;
          if (!map || allPoints.length < 2) return;
          map.fitToCoordinates(allPoints, {
            edgePadding: { top: 60, right: 50, bottom: 60, left: 50 },
            animated: false,
          });
        }}
        scrollEnabled
        zoomEnabled
        toolbarEnabled={false}
      >
        {drivingCoords.length > 1 ? (
          <Polyline
            coordinates={drivingCoords}
            strokeColor={colors.ink}
            strokeWidth={4}
          />
        ) : null}
        {walkCoords ? (
          <Polyline
            coordinates={walkCoords}
            strokeColor={colors.inkMuted}
            strokeWidth={3}
            lineDashPattern={[6, 6]}
          />
        ) : null}
        {uniqueStops.map((stop) => {
          const fill = pinColor(stop.highlight);
          const isDest = stop.highlight === "dest";
          return (
            <Marker
              key={stop.id}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              title={stop.name}
              anchor={isDest ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
              tracksViewChanges={trackMarkers}
            >
              {isDest ? (
                // Destination: teardrop pin, like Uber/Ola drop marker.
                <View style={styles.pinWrap}>
                  <View style={[styles.pin, { backgroundColor: fill }]}>
                    <View style={styles.pinInner} />
                  </View>
                  <View style={[styles.pinTip, { borderTopColor: fill }]} />
                </View>
              ) : stop.highlight === "via" ? (
                // Intermediate stop: small solid node on the route line.
                <View style={[styles.viaDot, { backgroundColor: fill }]} />
              ) : (
                // Source / pickup: filled dot with a soft halo ring.
                <View style={styles.originHalo}>
                  <View style={[styles.originDot, { backgroundColor: fill }]} />
                </View>
              )}
            </Marker>
          );
        })}
      </MapView>

      {badge ? (
        <View style={styles.badge}>
          <Ionicons name="time-outline" size={12} color={colors.ink} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  map: { width: "100%" },

  // Source / pickup marker: a solid dot inside a translucent halo ring.
  originHalo: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(10,10,10,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  originDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },

  // Intermediate route node.
  viaDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  // Destination teardrop pin.
  pinWrap: {
    alignItems: "center",
  },
  pin: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.floating,
  },
  pinInner: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  pinTip: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -2,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  badgeText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },
});
