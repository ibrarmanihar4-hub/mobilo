// Shared row shapes for the driver app. These mirror the Supabase tables
// created by the rider app's migration (drivers, trips, driver_kyc). Kept
// minimal - only what the driver app reads/writes.

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


// ---------------------------------------------------------------------------
// KYC
// ---------------------------------------------------------------------------

export type KycStatus = 'pending' | 'approved' | 'rejected';

export interface DriverKycRow {
  driver_id: string;
  status: KycStatus;
  rejection_reason: string | null;

  // personal
  full_name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact: string | null;

  // aadhaar
  aadhaar_number: string | null;
  aadhaar_front_url: string | null;
  aadhaar_back_url: string | null;

  // pan
  pan_number: string | null;
  pan_url: string | null;

  // license
  license_number: string | null;
  license_expiry: string | null;
  license_front_url: string | null;
  license_back_url: string | null;

  // profile photo
  selfie_url: string | null;

  // vehicle
  vehicle_type: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  rc_number: string | null;
  rc_front_url: string | null;
  rc_back_url: string | null;

  // insurance
  insurance_number: string | null;
  insurance_expiry: string | null;
  insurance_url: string | null;

  // puc
  puc_number: string | null;
  puc_expiry: string | null;
  puc_url: string | null;

  // bank
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  passbook_url: string | null;

  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}
