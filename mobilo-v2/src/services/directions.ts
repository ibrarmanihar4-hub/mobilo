// Google Directions API helper.
//
// react-native-maps Polyline only connects coordinates with straight lines.
// To follow real roads we call Directions API, decode the returned polyline,
// and feed those points into the Polyline component.
//
// Requirements on the Google Cloud key:
//   1. "Directions API" must be enabled.
//   2. The key must allow the device's app/SHA-1 (or be set to None for now).

const GOOGLE_MAPS_KEY = "AIzaSyBNzfuzjIGEx2KbR91LDrAs6JnofVPhl10";

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface DirectionsResponse {
  status: string;
  error_message?: string;
  routes?: Array<{
    overview_polyline?: { points: string };
    legs?: Array<{
      duration?: { value: number };
      distance?: { value: number };
    }>;
  }>;
}

/**
 * Decode a Google encoded polyline string into a list of latitude/longitude
 * pairs. Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const length = encoded.length;

  while (index < length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return points;
}

export interface DirectionsResult {
  path: LatLng[];
  durationSeconds: number;
  distanceMeters: number;
}

// Memoise results in-memory by route signature so we don't hammer the API
// every render. Each request is a few KB so the cache is bounded by 64.
const cache = new Map<string, DirectionsResult>();
const MAX_CACHE = 64;

function signature(waypoints: LatLng[]): string {
  return waypoints
    .map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`)
    .join("|");
}

/**
 * Fetch a road-following path between waypoints. The first item is treated
 * as the origin, the last as the destination, and any others as via-points.
 */
export async function fetchDirections(
  waypoints: LatLng[],
  options?: { signal?: AbortSignal }
): Promise<DirectionsResult | null> {
  if (waypoints.length < 2) return null;

  const key = signature(waypoints);
  const cached = cache.get(key);
  if (cached) return cached;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const via = waypoints.slice(1, -1);

  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: "driving",
    key: GOOGLE_MAPS_KEY,
  });

  if (via.length > 0) {
    params.set(
      "waypoints",
      via.map((p) => `${p.latitude},${p.longitude}`).join("|")
    );
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: options?.signal });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  let body: DirectionsResponse;
  try {
    body = (await response.json()) as DirectionsResponse;
  } catch {
    return null;
  }

  if (body.status !== "OK" || !body.routes?.length) {
    return null;
  }

  const route = body.routes[0];
  const encoded = route.overview_polyline?.points;
  if (!encoded) return null;

  const path = decodePolyline(encoded);
  const durationSeconds =
    route.legs?.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0) ?? 0;
  const distanceMeters =
    route.legs?.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0) ?? 0;

  const result: DirectionsResult = {
    path,
    durationSeconds,
    distanceMeters,
  };

  // Bounded LRU-style: drop the oldest entry when full.
  if (cache.size >= MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, result);

  return result;
}
