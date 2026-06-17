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
const EXPANDED_RADIUS_M = 20000000;
const OFFER_TTL_SECONDS = 15;

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

  // Find nearest drivers, expanding the radius once if the first pass is empty.
  async function findDrivers(radius: number) {
    const { data, error } = await admin.rpc("dispatch_find_drivers", {
      p_trip_id: payload.trip_id,
      p_radius_m: radius,
      p_limit: 1,
    });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  let candidates: { driver_id: string; distance_m: number }[];
  try {
    candidates = await findDrivers(INITIAL_RADIUS_M);
    if (candidates.length === 0) {
      candidates = await findDrivers(EXPANDED_RADIUS_M);
    }
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "dispatch failed" },
      500,
    );
  }

  if (candidates.length === 0) {
    return json({ status: "no_drivers" });
  }

  const nearest = candidates[0];
  const expiresAt = new Date(Date.now() + OFFER_TTL_SECONDS * 1000).toISOString();

  // Upsert the offer. A prior offer to this driver for this trip may exist in
  // a terminal state (expired/rejected/cancelled) - revive it rather than
  // erroring on the unique (trip_id, driver_id) constraint. onConflict +
  // ignoreDuplicates:false performs an update.
  const { data: offer, error: offerErr } = await admin
    .from("trip_offers")
    .upsert(
      {
        trip_id: payload.trip_id,
        driver_id: nearest.driver_id,
        distance_m: nearest.distance_m,
        status: "offered",
        offered_at: new Date().toISOString(),
        expires_at: expiresAt,
        responded_at: null,
      },
      { onConflict: "trip_id,driver_id" },
    )
    .select("id, driver_id, expires_at")
    .single();

  if (offerErr) {
    return json({ error: offerErr.message }, 500);
  }

  return json({
    status: "offered",
    offer_id: offer.id,
    driver_id: offer.driver_id,
    distance_m: nearest.distance_m,
    expires_at: offer.expires_at,
  });
});
