// Direct-ride trip lifecycle + live driver tracking (rider side).
//
// A trip moves through: requested -> assigned -> arriving -> ongoing ->
// completed (or cancelled). The rider creates a `requested` trip; a driver
// claims it (sets driver_id + status=assigned); both sides watch the row via
// Supabase Realtime so status and the assigned driver's live location update
// without polling.

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Database } from "../types/database";

export type TripRow = Database["public"]["Tables"]["trips"]["Row"];
export type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];

export type DirectRideType = "cab" | "auto" | "moto";

export interface CreateTripInput {
  bookingCode: string;
  rideType: DirectRideType;
  pickupName: string;
  pickupLat: number;
  pickupLng: number;
  dropName: string;
  dropLat: number;
  dropLng: number;
  fare: number;
}

/** 4-digit pickup OTP the rider shares with the driver. */
function makeOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Create a ride request. Returns the new trip row (status=requested). */
export async function createTrip(
  input: CreateTripInput
): Promise<TripRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("trips")
    .insert({
      booking_code: input.bookingCode,
      rider_id: user.id,
      ride_type: input.rideType,
      status: "requested",
      pickup_name: input.pickupName,
      pickup_lat: input.pickupLat,
      pickup_lng: input.pickupLng,
      drop_name: input.dropName,
      drop_lat: input.dropLat,
      drop_lng: input.dropLng,
      fare: input.fare,
      otp: makeOtp(),
    })
    .select("*")
    .single();

  if (error) {
    console.warn("createTrip failed:", error.message);
    return null;
  }
  return data as TripRow;
}

/** Rider cancels their own trip. */
export async function cancelTrip(tripId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const { error } = await client
    .from("trips")
    .update({ status: "cancelled", cancelled_by: "rider" })
    .eq("id", tripId);
  if (error) console.warn("cancelTrip failed:", error.message);
}

/** Fetch a single driver row (name/vehicle/rating/location). */
export async function fetchDriver(driverId: string): Promise<DriverRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const { data, error } = await client
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .maybeSingle();
  if (error) {
    console.warn("fetchDriver failed:", error.message);
    return null;
  }
  return (data as DriverRow) ?? null;
}

/**
 * Watch a trip row for status / driver-assignment changes.
 * Returns an unsubscribe function.
 */
export function subscribeToTrip(
  tripId: string,
  onChange: (trip: TripRow) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(`trip:${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "trips",
        filter: `id=eq.${tripId}`,
      },
      (payload) => onChange(payload.new as TripRow)
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * Watch an assigned driver's live location. Fires on every drivers-row
 * update for that driver (the driver app updates current_lat/lng on a timer).
 * Returns an unsubscribe function.
 */
export function subscribeToDriverLocation(
  driverId: string,
  onMove: (driver: DriverRow) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(`driver-loc:${driverId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "drivers",
        filter: `id=eq.${driverId}`,
      },
      (payload) => onMove(payload.new as DriverRow)
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Phase 1 dispatch: proximity-based offer loop.
//
// Instead of a driver claiming any requested trip, the rider asks the
// `dispatch-trip` Edge Function to find the nearest eligible driver and create
// a timed offer. The driver app accepts/rejects via acceptOffer/rejectOffer.
// On expiry or rejection the rider re-invokes requestDispatch to roll to the
// next nearest driver.
// ---------------------------------------------------------------------------

export type TripOfferRow = Database["public"]["Tables"]["trip_offers"]["Row"];

export type DispatchResult =
  | { status: "offered"; offerId: string; driverId: string; distanceM: number; expiresAt: string }
  | { status: "no_drivers" }
  | { status: "noop"; tripStatus: string };

/**
 * Ask the dispatcher to offer this trip to the nearest available driver.
 * Returns what happened so the UI can show "finding driver", "no drivers
 * nearby", etc. Safe to call repeatedly (e.g. after an offer expires).
 */
export async function requestDispatch(
  tripId: string
): Promise<DispatchResult | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();

  const { data, error } = await client.functions.invoke("dispatch-trip", {
    body: { trip_id: tripId },
  });

  if (error) {
    console.warn("requestDispatch failed:", error.message);
    return null;
  }

  const result = data as {
    status: string;
    offer_id?: string;
    driver_id?: string;
    distance_m?: number;
    expires_at?: string;
    trip_status?: string;
  };

  switch (result.status) {
    case "offered":
      return {
        status: "offered",
        offerId: result.offer_id as string,
        driverId: result.driver_id as string,
        distanceM: result.distance_m ?? 0,
        expiresAt: result.expires_at as string,
      };
    case "no_drivers":
      return { status: "no_drivers" };
    default:
      return { status: "noop", tripStatus: result.trip_status ?? "unknown" };
  }
}

/**
 * Driver accepts an offer. Atomically: mark the offer accepted and claim the
 * trip (set driver_id + status=assigned). RLS ensures only the offered driver
 * can do this. Returns true on success.
 */
export async function acceptOffer(
  offerId: string,
  tripId: string,
  driverId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const client = getSupabase();

  // Only accept if the offer is still open and unexpired.
  const { data: offer, error: offerErr } = await client
    .from("trip_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "offered")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (offerErr || !offer) {
    if (offerErr) console.warn("acceptOffer failed:", offerErr.message);
    return false;
  }

  // Claim the trip only if still unassigned (guards against races).
  const { data: trip, error: tripErr } = await client
    .from("trips")
    .update({ driver_id: driverId, status: "assigned" })
    .eq("id", tripId)
    .eq("status", "requested")
    .is("driver_id", null)
    .select("id")
    .maybeSingle();

  if (tripErr || !trip) {
    // Lost the race - revert our offer so dispatch can continue cleanly.
    await client
      .from("trip_offers")
      .update({ status: "cancelled" })
      .eq("id", offerId);
    if (tripErr) console.warn("acceptOffer trip claim failed:", tripErr.message);
    return false;
  }

  return true;
}

/** Driver rejects an offer so the rider can be re-dispatched to the next driver. */
export async function rejectOffer(offerId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const { error } = await client
    .from("trip_offers")
    .update({ status: "rejected", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "offered");
  if (error) console.warn("rejectOffer failed:", error.message);
}

/**
 * Watch incoming offers for a driver (driver app). Fires when a new offer
 * row is inserted for this driver. Returns an unsubscribe function.
 */
export function subscribeToDriverOffers(
  driverId: string,
  onOffer: (offer: TripOfferRow) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(`driver-offers:${driverId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "trip_offers",
        filter: `driver_id=eq.${driverId}`,
      },
      (payload) => onOffer(payload.new as TripOfferRow)
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Phase 2: live driver location over Realtime Broadcast.
//
// During an active trip the driver app broadcasts its GPS on a per-trip
// channel (topic `trip-loc:{tripId}`) ~every 3s. This never touches the
// database, so live tracking no longer loads Postgres. The rider subscribes
// to that channel to move the driver marker.
//
// The DB `drivers.current_lat/lng` is still updated slowly (~20s) by the
// driver app, so subscribeToDriverLocation remains useful for seeding the
// initial marker when the status screen first mounts.
// ---------------------------------------------------------------------------

export interface LiveLocation {
  lat: number;
  lng: number;
  heading: number | null;
  at: number;
}

/** Must match the driver app's tripLocationTopic(). */
function tripLocationTopic(tripId: string): string {
  return `trip-loc:${tripId}`;
}

/**
 * Subscribe to the assigned driver's broadcast location for a trip. Returns
 * an unsubscribe function. Fires roughly every few seconds while the driver
 * is moving; payload is ephemeral (not persisted).
 */
export function subscribeToTripDriverLocation(
  tripId: string,
  onMove: (loc: LiveLocation) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(tripLocationTopic(tripId), {
      // private:true gates reads via realtime.messages RLS (only the trip's
      // rider/driver may listen). Enforced once "Allow public access" is
      // disabled in Realtime Settings.
      config: { private: true, broadcast: { self: false } },
    })
    .on("broadcast", { event: "loc" }, (message) => {
      const p = message.payload as Partial<LiveLocation> | undefined;
      if (
        p &&
        typeof p.lat === "number" &&
        typeof p.lng === "number"
      ) {
        onMove({
          lat: p.lat,
          lng: p.lng,
          heading: typeof p.heading === "number" ? p.heading : null,
          at: typeof p.at === "number" ? p.at : Date.now(),
        });
      }
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
