// Repository layer for booking history.
//
// Calls Supabase when configured, otherwise no-ops gracefully. The local
// AsyncStorage cache in BookingHistoryContext stays the source of truth
// for the UI; this layer mirrors writes to the cloud and lets us hydrate
// from there on first install.

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { BookingHistoryItem } from "../context/BookingHistoryContext";

const TABLE = "bookings";

export interface RemoteBooking {
  id: string;
  user_id: string;
  booking_code: string;
  ride_type: BookingHistoryItem["rideType"];
  title: string;
  route: string;
  time: string;
  fare: string;
  status: BookingHistoryItem["status"];
  icon: string;
  accent: string;
  created_at: string; // ISO
}

function toRemote(
  booking: BookingHistoryItem,
  userId: string
): RemoteBooking {
  return {
    id: booking.id,
    user_id: userId,
    booking_code: booking.bookingCode,
    ride_type: booking.rideType,
    title: booking.title,
    route: booking.route,
    time: booking.time,
    fare: booking.fare,
    status: booking.status,
    icon: String(booking.icon),
    accent: booking.accent,
    created_at: new Date(booking.createdAt).toISOString(),
  };
}

function fromRemote(row: RemoteBooking): BookingHistoryItem {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    rideType: row.ride_type,
    title: row.title,
    route: row.route,
    time: row.time,
    fare: row.fare,
    status: row.status,
    icon: row.icon as BookingHistoryItem["icon"],
    accent: row.accent,
    createdAt: new Date(row.created_at).getTime(),
  };
}

/** Fetch the signed-in user's bookings, newest first. */
export async function fetchBookings(): Promise<BookingHistoryItem[]> {
  if (!isSupabaseConfigured) return [];
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return [];

  const { data, error } = await client
    .from(TABLE)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("fetchBookings failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => fromRemote(row as RemoteBooking));
}

/** Insert (or upsert by booking_code) a booking for the signed-in user. */
export async function saveBooking(
  booking: BookingHistoryItem
): Promise<void> {
  if (!isSupabaseConfigured) return;
  const client = getSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return;

  const { error } = await client
    .from(TABLE)
    .upsert(toRemote(booking, user.id), { onConflict: "booking_code" });

  if (error) {
    console.warn("saveBooking failed:", error.message);
  }
}
