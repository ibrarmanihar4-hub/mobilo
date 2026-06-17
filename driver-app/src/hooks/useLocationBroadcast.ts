// Drives the driver's live location (Phase 2).
//
// Two channels of delivery, by design:
//   1. Realtime Broadcast (fast, ~3s) on a per-trip channel - this is what
//      the rider watches during an active trip. Ephemeral, never hits the DB.
//   2. Low-frequency DB write (~20s) to drivers.current_lat/lng - keeps
//      dispatch_find_drivers fresh and lets a reopened rider app seed the
//      initial marker. This is the ONLY DB traffic now, down from every 4s.
//
// Usage:
//   useLocationBroadcast(online)            -> just online, slow DB writes only
//   useLocationBroadcast(online, tripId)    -> on a trip, fast broadcast + slow DB

import { useEffect, useRef } from "react";
import * as Location from "expo-location";

import { updateDriverLocation } from "../services/driverRepo";
import {
  DriverLocationBroadcaster,
  type LocationPayload,
} from "../services/locationChannel";

// Fast broadcast cadence (what the rider sees during a trip).
const BROADCAST_MS = 3000;
// Slow DB-write cadence (dispatch freshness + recovery seed).
const DB_WRITE_MS = 20000;

export function useLocationBroadcast(active: boolean, tripId?: string) {
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const lastBroadcast = useRef(0);
  const lastDbWrite = useRef(0);
  const broadcasterRef = useRef<DriverLocationBroadcaster | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Spin up a per-trip broadcast channel only when on a trip.
    if (active && tripId) {
      broadcasterRef.current = new DriverLocationBroadcaster(tripId);
      broadcasterRef.current.start();
    }

    async function start() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;

      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: BROADCAST_MS,
        },
        (loc) => {
          const now = Date.now();
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          const heading = loc.coords.heading ?? null;

          // 1. Fast path: broadcast to the rider over Realtime (no DB).
          if (
            broadcasterRef.current &&
            now - lastBroadcast.current >= BROADCAST_MS
          ) {
            lastBroadcast.current = now;
            const payload: LocationPayload = { lat, lng, heading, at: now };
            broadcasterRef.current.send(payload);
          }

          // 2. Slow path: persist a snapshot for dispatch + recovery.
          if (now - lastDbWrite.current >= DB_WRITE_MS) {
            lastDbWrite.current = now;
            void updateDriverLocation({ lat, lng, heading });
          }
        }
      );
    }

    if (active) void start();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      broadcasterRef.current?.close();
      broadcasterRef.current = null;
    };
  }, [active, tripId]);
}
