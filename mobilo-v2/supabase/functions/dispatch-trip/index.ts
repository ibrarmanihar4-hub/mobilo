// dispatch-trip - proximity-based ride dispatch (Phase 1).
//
// Called when a trip needs a driver. Implements the Ola/Uber-style sequential
// offer loop on top of the `dispatch_find_drivers` PostGIS RPC:
//
//   1. Look up the trip; bail if it isn't still `requested`.
//   2. Find the nearest eligible online drivers (right ride type, within
//      radius, not already offered this trip) via dispatch_find_drivers().
//   3. Offer the trip to the single nearest driver: insert a trip_offers row
//      with a short expiry. The driver app sees it over Realtime and
//      accepts/rejects.
//   4. The caller re-invokes this function (or a cron sweeper does) when an
//      offer expires/rejects, to roll to the next nearest driver. Each call
//      offers exactly one driver, keeping the logic simple and idempotent.
//   5. If no drivers are found within the radius, expand the radius once;
//      if still none, return `no_drivers` so the client can show a message.
//
// This function uses the SERVICE ROLE key so it can read all drivers and
// write offers regardless of RLS. It must therefore validate its own input
// and never trust client-supplied driver ids.
//
// Auth: verify_jwt is enabled. The rider's JWT is required, and we confirm
// the caller owns the trip before dispatching. This prevents a user from
// triggering dispatch on someone else's trip.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Dispatch tuning. Tune these as you learn real supply/demand.
// TEST CONVENIENCE: radius effectively unlimited (20,000 km) so distance
// never blocks testing. PRODUCTION TODO: restore city-scale radii (~4-8 km).
const INITIAL_RADIUS_M = 20000000;
const OFFER_TTL_SECONDS = 30;

interface DispatchRequest {
  trip_id: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // The rider's bearer token, forwarded so we can confirm trip ownership
  // using an RLS-scoped client.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Missing bearer token" }, 401);
  }

  let payload: DispatchRequest;
  try {
    payload = (await req.json()) as DispatchRequest;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.trip_id) {
    return json({ error: "trip_id is required" }, 400);
  }

  // Service-role client: full access for dispatch writes.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // RLS-scoped client bound to the caller's JWT: used only to confirm the
  // caller is the rider on this trip.
  const asUser = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await asUser.auth.getUser();
  if (userErr || !user) {
    return json({ error: "Invalid session" }, 401);
  }

  // Load the trip with the service client (avoids RLS edge cases) and then
  // authorize: only the rider who owns it may dispatch.
  const { data: trip, error: tripErr } = await admin
    .from("trips")
    .select("id, rider_id, status")
    .eq("id", payload.trip_id)
    .maybeSingle();

  if (tripErr) return json({ error: tripErr.message }, 500);
  if (!trip) return json({ error: "Trip not found" }, 404);
  if (trip.rider_id !== user.id) {
    return json({ error: "Not your trip" }, 403);
  }
  if (trip.status !== "requested") {
    // Already assigned/cancelled/etc. - nothing to dispatch.
    return json({ status: "noop", trip_status: trip.status });
  }

  // Offer the trip to the next eligible driver (or cancel it if everyone has
  // declined their allowed attempts). All of the find-driver + offer + cancel
  // logic lives in the dispatch_offer_next SQL function so the foreground
  // Edge Function and the background cron sweeper behave identically and the
  // decline limit is enforced in one place.
  const { data: result, error: rpcErr } = await admin.rpc(
    "dispatch_offer_next",
    {
      p_trip_id: payload.trip_id,
      p_radius_m: INITIAL_RADIUS_M,
      p_offer_ttl_seconds: OFFER_TTL_SECONDS,
    },
  );

  if (rpcErr) {
    return json({ error: rpcErr.message }, 500);
  }

  const r = (result ?? {}) as {
    status?: string;
    offer_id?: string;
    driver_id?: string;
    distance_m?: number;
    expires_at?: string;
    trip_status?: string;
  };

  switch (r.status) {
    case "offered":
      return json({
        status: "offered",
        offer_id: r.offer_id,
        driver_id: r.driver_id,
        distance_m: r.distance_m,
        expires_at: r.expires_at,
      });
    case "cancelled":
      // Every eligible driver declined their attempts; the trip was cancelled.
      return json({ status: "cancelled" });
    case "pending":
      // A driver is currently deciding on a live offer; keep waiting.
      return json({ status: "pending" });
    case "noop":
      return json({ status: "noop", trip_status: r.trip_status });
    case "no_drivers":
    default:
      return json({ status: "no_drivers" });
  }
});
