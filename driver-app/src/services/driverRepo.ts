// Driver-side data layer: driver profile, availability, live location, and
// the trip lifecycle (claim an open request, progress it, complete/cancel).

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  DriverRow,
  DriverStatus,
  RideType,
  TripOfferRow,
  TripRow,
} from "../types";

// --------------------------------------------------------------------------
// Driver profile
// --------------------------------------------------------------------------

export async function fetchMyDriver(): Promise<DriverRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("drivers")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.warn("fetchMyDriver failed:", error.message);
    return null;
  }
  return (data as DriverRow) ?? null;
}

/** Create or update the driver profile + mark the profile row as a driver. */
export async function upsertDriver(input: {
  fullName: string;
  phone: string | null;
  rideType: RideType;
  vehicleLabel: string;
  vehiclePlate: string;
}): Promise<DriverRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  // Flag the profile as a driver (used by trip RLS policies).
  await client.from("profiles").update({ role: "driver" }).eq("id", user.id);

  const { data, error } = await client
    .from("drivers")
    .upsert(
      {
        id: user.id,
        full_name: input.fullName,
        phone: input.phone,
        ride_type: input.rideType,
        vehicle_label: input.vehicleLabel,
        vehicle_plate: input.vehiclePlate,
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) {
    console.warn("upsertDriver failed:", error.message);
    return null;
  }
  return data as DriverRow;
}

export async function setDriverStatus(status: DriverStatus): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  const { error } = await client
    .from("drivers")
    .update({ status })
    .eq("id", user.id);
  if (error) console.warn("setDriverStatus failed:", error.message);
}

/** Push the driver's live location. Called on a timer while online. */
export async function updateDriverLocation(params: {
  lat: number;
  lng: number;
  heading?: number | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;
  const { error } = await client
    .from("drivers")
    .update({
      current_lat: params.lat,
      current_lng: params.lng,
      heading: params.heading ?? null,
      location_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) console.warn("updateDriverLocation failed:", error.message);
}

// --------------------------------------------------------------------------
// Trips
// --------------------------------------------------------------------------

/** Open (unassigned) ride requests matching this driver's ride type. */
export async function fetchOpenTrips(rideType: RideType): Promise<TripRow[]> {
  if (!isSupabaseConfigured) return [];
  const client = getSupabase();
  const { data, error } = await client
    .from("trips")
    .select("*")
    .eq("status", "requested")
    .eq("ride_type", rideType)
    .is("driver_id", null)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("fetchOpenTrips failed:", error.message);
    return [];
  }
  return (data as TripRow[]) ?? [];
}

/** The trip currently assigned to this driver and still active, if any. */
export async function fetchActiveTrip(): Promise<TripRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data, error } = await client
    .from("trips")
    .select("*")
    .eq("driver_id", user.id)
    .in("status", ["assigned", "arriving", "ongoing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("fetchActiveTrip failed:", error.message);
    return null;
  }
  return (data as TripRow) ?? null;
}

/**
 * Claim an open request. Uses a conditional update (driver_id is null) so
 * two drivers can't both grab the same trip - whoever's update matches the
 * still-null row wins; the loser gets an empty result.
 */
export async function claimTrip(tripId: string): Promise<TripRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const { data, error } = await client
    .from("trips")
    .update({ driver_id: user.id, status: "assigned" })
    .eq("id", tripId)
    .eq("status", "requested")
    .is("driver_id", null)
    .select("*")
    .maybeSingle();

  if (error) {
    console.warn("claimTrip failed:", error.message);
    return null;
  }
  if (data) {
    await setDriverStatus("on_trip");
  }
  return (data as TripRow) ?? null;
}

export async function advanceTrip(
  tripId: string,
  status: TripRow["status"]
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const { error } = await client
    .from("trips")
    .update({ status })
    .eq("id", tripId);
  if (error) console.warn("advanceTrip failed:", error.message);

  if (status === "completed" || status === "cancelled") {
    await setDriverStatus("online");
  }
}

export async function cancelTripByDriver(tripId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const { error } = await client
    .from("trips")
    .update({ status: "cancelled", cancelled_by: "driver" })
    .eq("id", tripId);
  if (error) console.warn("cancelTripByDriver failed:", error.message);
  await setDriverStatus("online");
}

/** Live subscription to new open requests for this ride type. */
export function subscribeToOpenTrips(
  rideType: RideType,
  onChange: () => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(`open-trips:${rideType}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trips",
        filter: `ride_type=eq.${rideType}`,
      },
      () => onChange()
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** Live subscription to a single trip the driver is handling. */
export function subscribeToTrip(
  tripId: string,
  onChange: (trip: TripRow) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(`driver-trip:${tripId}`)
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

// --------------------------------------------------------------------------
// Offer-based dispatch (Phase 1)
//
// Instead of every driver seeing every open request and racing to claim, the
// server's dispatcher offers a trip to the nearest eligible driver via a
// `trip_offers` row. The driver sees only offers addressed to them, with a
// short countdown, and accepts or rejects. Accepting atomically claims the
// trip; rejecting/expiry lets the dispatcher roll to the next driver.
// --------------------------------------------------------------------------

export interface OfferWithTrip {
  offer: TripOfferRow;
  trip: TripRow;
}

/**
 * Fetch this driver's currently open (offered, unexpired) offers, each joined
 * with its trip details for display.
 */
export async function fetchMyOffers(): Promise<OfferWithTrip[]> {
  if (!isSupabaseConfigured) return [];
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];

  const { data, error } = await client
    .from("trip_offers")
    .select("*, trips(*)")
    .eq("driver_id", user.id)
    .eq("status", "offered")
    .gt("expires_at", new Date().toISOString())
    .order("offered_at", { ascending: true });

  if (error) {
    console.warn("fetchMyOffers failed:", error.message);
    return [];
  }

  // Supabase returns the joined trip under the `trips` key.
  return (data ?? [])
    .map((row: any) => {
      const { trips, ...offer } = row;
      if (!trips) return null;
      return { offer: offer as TripOfferRow, trip: trips as TripRow };
    })
    .filter((x): x is OfferWithTrip => x !== null)
    // Only surface offers whose trip is still waiting for a driver.
    .filter((x) => x.trip.status === "requested" && x.trip.driver_id === null);
}

/**
 * Accept an offer: mark it accepted and atomically claim the trip. Returns
 * the claimed trip on success, or null if the offer expired or another
 * driver/race won the trip first.
 */
export async function acceptOffer(
  offerId: string,
  tripId: string
): Promise<TripRow | null> {
  if (!isSupabaseConfigured) return null;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  // 1. Mark the offer accepted only if still open + unexpired (RLS ensures
  //    the offer belongs to this driver).
  const { data: offer, error: offerErr } = await client
    .from("trip_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "offered")
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (offerErr || !offer) {
    if (offerErr) console.warn("acceptOffer (offer) failed:", offerErr.message);
    return null;
  }

  // 2. Claim the trip if still unassigned (guards against races).
  const { data: trip, error: tripErr } = await client
    .from("trips")
    .update({ driver_id: user.id, status: "assigned" })
    .eq("id", tripId)
    .eq("status", "requested")
    .is("driver_id", null)
    .select("*")
    .maybeSingle();

  if (tripErr || !trip) {
    // Lost the race - revert our offer so the dispatcher can continue.
    await client
      .from("trip_offers")
      .update({ status: "cancelled" })
      .eq("id", offerId);
    if (tripErr) console.warn("acceptOffer (trip) failed:", tripErr.message);
    return null;
  }

  await setDriverStatus("on_trip");
  return trip as TripRow;
}

/** Reject an offer so the dispatcher rolls to the next nearest driver. */
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
 * Live subscription to offers addressed to this driver. Fires on insert
 * (new offer) and update (e.g. expiry/cancel) so the UI can refresh.
 */
export function subscribeToMyOffers(
  driverId: string,
  onChange: () => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();
  const channel = client
    .channel(`my-offers:${driverId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trip_offers",
        filter: `driver_id=eq.${driverId}`,
      },
      () => onChange()
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
