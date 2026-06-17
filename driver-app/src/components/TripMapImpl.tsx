import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

import { colors, mapStyleLight, radii, shadows } from "../theme";

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

export default function TripMapImpl({ points, height = 240, style }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [track, setTrack] = useState(true);

  const key = points
    .map((p) => `${p.id}:${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`)
    .join("|");

  useEffect(() => {
    setTrack(true);
    const t = setTimeout(() => setTrack(false), 1500);
    return () => clearTimeout(t);
  }, [key]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;
    const t = setTimeout(() => {
      map.fitToCoordinates(
        points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
        {
          edgePadding: { top: 60, right: 50, bottom: 60, left: 50 },
          animated: true,
        }
      );
    }, 250);
    return () => clearTimeout(t);
  }, [key]);

  const initialRegion = {
    latitude: points[0].latitude,
    longitude: points[0].longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const routePts = points.filter((p) => p.kind !== "driver");

  return (
    <View style={[styles.shell, style]}>
      <MapView
        ref={mapRef}
        style={[styles.map, { height }]}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyleLight}
        initialRegion={initialRegion}
      >
        {routePts.length > 1 ? (
          <Polyline
            coordinates={routePts.map((p) => ({
              latitude: p.latitude,
              longitude: p.longitude,
            }))}
            strokeColor={colors.ink}
            strokeWidth={4}
          />
        ) : null}

        {points.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            anchor={p.kind === "drop" ? { x: 0.5, y: 1 } : { x: 0.5, y: 0.5 }}
            tracksViewChanges={track}
          >
            {p.kind === "driver" ? (
              <View style={styles.carWrap}>
                <View style={styles.car} />
              </View>
            ) : p.kind === "drop" ? (
              <View style={styles.pinWrap}>
                <View style={[styles.pin, { backgroundColor: colors.danger }]}>
                  <View style={styles.pinInner} />
                </View>
                <View
                  style={[styles.pinTip, { borderTopColor: colors.danger }]}
                />
              </View>
            ) : (
              <View style={styles.originHalo}>
                <View
                  style={[styles.originDot, { backgroundColor: colors.ink }]}
                />
              </View>
            )}
          </Marker>
        ))}
      </MapView>
    </View>
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
  map: { width: "100%" },
  carWrap: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  car: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
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
  pinWrap: { alignItems: "center" },
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
});
