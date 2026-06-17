// Seat inventory for shuttle departures.
//
// A "departure" is identified by a stable key the client builds from the
// route id + the departure's ISO time. The unique constraint on
// (departure_key, seat_number) in Postgres is what actually prevents two
// riders from grabbing the same seat - if a second insert collides, the
// gateway returns a unique-violation and we surface it as "seat taken".

import { getSupabase, isSupabaseConfigured } from "./supabase";

const TABLE = "seat_reservations";

/** Build a stable departure key from a route id and an epoch/ISO time. */
export function buildDepartureKey(routeId: string, departureEpoch: number): string {
  // Minute precision is enough to distinguish 30-min slots and keeps the
  // key stable across re-renders.
  const iso = new Date(departureEpoch).toISOString().slice(0, 16);
  return `${routeId}|${iso}`;
}

/** Seat numbers already reserved for a departure. */
export async function fetchReservedSeats(
  departureKey: string
): Promise<number[]> {
  if (!isSupabaseConfigured) return [];
  const client = getSupabase();
  const { data, error } = await client
    .from(TABLE)
    .select("seat_number")
    .eq("departure_key", departureKey);

  if (error) {
    console.warn("fetchReservedSeats failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.seat_number as number);
}

export type ReserveResult =
  | { ok: true }
  | { ok: false; takenSeats: number[]; message: string };

/**
 * Atomically reserve seats for a departure. Because of the unique index,
 * a colliding seat causes the whole insert to fail with code 23505; we then
 * re-read the live reservations so the UI can show exactly which seats were
 * snapped up by someone else.
 */
export async function reserveSeats(params: {
  departureKey: string;
  seatNumbers: number[];
  bookingCode: string;
}): Promise<ReserveResult> {
  const { departureKey, seatNumbers, bookingCode } = params;
  if (!isSupabaseConfigured) return { ok: true };

  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { ok: false, takenSeats: [], message: "You must be signed in." };
  }

  const rows = seatNumbers.map((seat) => ({
    departure_key: departureKey,
    seat_number: seat,
    user_id: user.id,
    booking_code: bookingCode,
  }));

  const { error } = await client.from(TABLE).insert(rows);

  if (error) {
    // 23505 = unique_violation -> at least one seat was taken meanwhile.
    if ((error as { code?: string }).code === "23505") {
      const taken = await fetchReservedSeats(departureKey);
      const clash = seatNumbers.filter((s) => taken.includes(s));
      return {
        ok: false,
        takenSeats: clash,
        message:
          clash.length > 0
            ? `Seat ${clash.join(", ")} was just booked. Pick another.`
            : "Some seats were just booked. Pick again.",
      };
    }
    return { ok: false, takenSeats: [], message: error.message };
  }

  return { ok: true };
}

/** Release seats (e.g. if payment fails after reservation). */
export async function releaseSeats(params: {
  departureKey: string;
  seatNumbers: number[];
}): Promise<void> {
  const { departureKey, seatNumbers } = params;
  if (!isSupabaseConfigured || seatNumbers.length === 0) return;
  const client = getSupabase();
  const { error } = await client
    .from(TABLE)
    .delete()
    .eq("departure_key", departureKey)
    .in("seat_number", seatNumbers);
  if (error) console.warn("releaseSeats failed:", error.message);
}

/**
 * Subscribe to live seat changes for a departure. Calls `onChange` with the
 * fresh reserved-seat list whenever a reservation is inserted/deleted.
 * Returns an unsubscribe function.
 */
export function subscribeToSeats(
  departureKey: string,
  onChange: (reserved: number[]) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const client = getSupabase();

  const channel = client
    .channel(`seats:${departureKey}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLE,
        filter: `departure_key=eq.${departureKey}`,
      },
      () => {
        void fetchReservedSeats(departureKey).then(onChange);
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
