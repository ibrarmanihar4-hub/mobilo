import { normalizeRoutes, RawShuttleRoute, ShuttleRoute } from "../types/routeNetwork";
import { getSupabase, isSupabaseConfigured } from "./supabase";

/**
 * Fetches the live shuttle route network from Supabase (routes +
 * route_stops, ordered by stop_order). Routes are public data (the admin
 * console manages them), so this works for anonymous riders too.
 *
 * Returns an empty array if Supabase isn't configured or the query fails;
 * the caller (RouteDataContext) falls back to the bundled default routes.
 */
export async function fetchRoutesFromApi(
  signal?: AbortSignal
): Promise<ShuttleRoute[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  const client = getSupabase();

  const { data, error } = await client
    .from("routes")
    .select("id, name, direction, route_stops(name, latitude, longitude, map_url, stop_order)")
    .order("created_at", { ascending: true })
    .abortSignal(signal as AbortSignal);

  if (error) {
    throw new Error(error.message || "Unable to fetch route network.");
  }

  const rawRoutes: RawShuttleRoute[] = (data || []).map((route) => ({
    id: route.id,
    name: route.name,
    direction: route.direction,
    stops: [...(route.route_stops || [])]
      .sort((a, b) => a.stop_order - b.stop_order)
      .map((stop) => ({
        name: stop.name,
        latitude: stop.latitude,
        longitude: stop.longitude,
        mapUrl: stop.map_url || undefined,
      })),
  }));

  return normalizeRoutes(rawRoutes);
}
