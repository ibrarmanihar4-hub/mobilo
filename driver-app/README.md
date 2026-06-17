# Mobilo Driver

The driver-side companion app for Mobilo. It shares the **same Supabase
project** as the rider app, so trips created by riders show up here as
incoming requests, and the driver's live location streams back to the rider.

## What it does

- **Phone OTP auth** (same Supabase Auth as the rider app).
- **Driver profile setup** — name, vehicle type (cab/auto/moto), model, plate.
  Marks the `profiles.role` as `driver` and creates a `drivers` row.
- **Go online / offline** — a toggle that flips `drivers.status` and starts
  broadcasting live GPS location every few seconds.
- **Incoming requests** — live list of open `requested` trips matching the
  driver's vehicle type (via Supabase Realtime). Accepting atomically claims
  the trip so two drivers can't take the same one.
- **Active trip** — step the ride through `assigned → arriving → ongoing →
  completed`, verify the rider's pickup OTP before starting, navigate to
  pickup/drop, and cancel if needed. Location keeps broadcasting throughout.

## Setup

```
cd driver-app
npm install
cp .env.example .env   # set the SAME Supabase URL + anon key as the rider app
npx expo start -c
```

> Live maps and location require a custom dev build (not Expo Go) on a real
> device for full GPS behaviour. The UI runs in Expo Go; location simply
> won't stream without the native location permissions of a dev build.

## How it connects to the rider app

1. Rider books a cab/auto/moto → rider app inserts a `trips` row
   (`status=requested`).
2. Driver (online, matching `ride_type`) sees it in **Incoming requests** and
   taps **Accept** → `claimTrip` sets `driver_id` + `status=assigned`.
3. Rider's **DirectRideStatus** screen is subscribed to that trip row, so it
   instantly shows the assigned driver and starts tracking their live
   location from the `drivers` table.
4. Driver advances the trip; each status change pushes live to the rider.
5. OTP shown on the rider's screen must be entered by the driver to start the
   ride.

All access is enforced by Row Level Security (see the rider app's
`supabase/migrations` — drivers can only read open requests of their type or
trips assigned to them; riders only their own trips).
