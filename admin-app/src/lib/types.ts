export type DriverStatus = 'offline' | 'online' | 'on_trip';
export type KycStatus = 'pending' | 'approved' | 'rejected';
export type RideType = 'cab' | 'auto' | 'moto' | 'shuttle';
export type TripStatus = 'requested' | 'assigned' | 'arriving' | 'ongoing' | 'completed' | 'cancelled';
export type PaymentStatus = 'created' | 'paid' | 'failed' | 'refunded';

export interface DriverRow {
  id: string;
  full_name: string;
  phone: string | null;
  ride_type: RideType;
  vehicle_label: string;
  vehicle_plate: string;
  rating: number;
  status: DriverStatus;
  current_lat?: number;
  current_lng?: number;
  created_at: string;
  updated_at: string;
  driver_kyc?: {
    status: KycStatus;
  } | null;
}

export interface DriverKycRow {
  driver_id: string;
  status: KycStatus;
  rejection_reason: string | null;
  full_name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact: string | null;
  aadhaar_number: string | null;
  aadhaar_front_url: string | null;
  aadhaar_back_url: string | null;
  pan_number: string | null;
  pan_url: string | null;
  license_number: string | null;
  license_expiry: string | null;
  license_front_url: string | null;
  license_back_url: string | null;
  selfie_url: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  rc_number: string | null;
  rc_front_url: string | null;
  rc_back_url: string | null;
  insurance_number: string | null;
  insurance_expiry: string | null;
  insurance_url: string | null;
  puc_number: string | null;
  puc_expiry: string | null;
  puc_url: string | null;
  account_holder_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  passbook_url: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  drivers?: {
    full_name: string;
    phone: string | null;
    ride_type: RideType;
    vehicle_plate: string;
    status: DriverStatus;
  } | null;
}

export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'rider' | 'driver';
  created_at: string;
  updated_at: string;
  tripCount?: number;
}

export interface TripRow {
  id: string;
  booking_code: string;
  rider_id: string;
  driver_id: string | null;
  ride_type: 'cab' | 'auto' | 'moto';
  status: TripStatus;
  pickup_name: string;
  pickup_lat: number;
  pickup_lng: number;
  drop_name: string;
  drop_lat: number;
  drop_lng: number;
  fare: number;
  otp: string;
  payment_status: 'pending' | 'paid' | 'failed';
  cancelled_by: string | null;
  created_at: string;
  updated_at: string;
  drivers?: {
    full_name: string;
  } | null;
  profiles?: {
    full_name: string;
  } | null;
}

export interface RouteStopRow {
  id: string;
  route_id: string;
  stop_order: number;
  name: string;
  latitude: number;
  longitude: number;
  map_url: string | null;
  created_at: string;
}

export interface RouteRow {
  id: string;
  name: string;
  direction: string;
  created_at: string;
  updated_at: string;
  route_stops?: RouteStopRow[];
}

export interface PaymentRow {
  id: string;
  user_id: string;
  booking_code: string;
  amount: number; // in paise
  currency: string;
  method: string;
  gateway: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}
