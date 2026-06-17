// Shared row shapes for the driver app. These mirror the Supabase tables
// created by the rider app's migration (drivers, trips). Kept minimal -
// only what the driver app reads/writes.

export type RideType = "cab" | "auto" | "moto" | "shuttle";
export type DirectRideType = "cab" | "auto" | "moto";

export type DriverStatus = "offline" | "online" | "on_trip";

export interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  ride_type: RideType;
  vehicle_label: string;
  vehicle_plate: string;
  rating: number;
  status: DriverStatus;
  current_lat: number | null;
  current_lng: number | null;
  heading: number | null;
  location_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TripStatus =
  | "requested"
  | "assigned"
  | "arriving"
  | "ongoing"
  | "completed"
  | "cancelled";

export interface TripRow {
  id: string;
  booking_code: string;
  rider_id: string;
  driver_id: string | null;
  ride_type: DirectRideType;
  status: TripStatus;
  pickup_name: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_name: string;
  drop_lat: number;
  drop_lng: number;
  fare: number;
  otp: string;
  payment_status: string;
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TripOfferStatus =
  | "offered"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export interface TripOfferRow {
  id: string;
  trip_id: string;
  driver_id: string;
  status: TripOfferStatus;
  distance_m: number | null;
  offered_at: string;
  expires_at: string;
  responded_at: string | null;
}

