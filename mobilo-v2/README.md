# Mobilo

A junction-first transit + ride-hailing app (rider side). Pairs with the
**Mobilo Driver** app in `../driver-app`, both backed by the same Supabase
project.

## Architecture

- **Auth** — Supabase phone OTP (`src/context/AuthContext.tsx`). OTP delivery
  is handled server-side by the `send-sms-hook` Edge Function via 2Factor.in.
- **Database** — Supabase Postgres with RLS. Tables: `profiles`, `bookings`,
  `drivers`, `trips`, `seat_reservations`, `payments`
  (`supabase/migrations`).
- **Realtime** — riders watch their `trips` row and the assigned `drivers`
  row for live status + location; the shuttle seat map watches
  `seat_reservations`.

## Real systems (no longer simulated)

### Live driver tracking
Direct rides (cab/auto/moto) create a real `trips` row (`requested`). A driver
in the driver app claims it; the rider's **DirectRideStatus** screen
subscribes to the trip and the driver's live location, showing the driver
moving on the map (`src/services/tripsRepo.ts`).

### Real seat inventory
Shuttle seats are backed by `seat_reservations` with a unique constraint on
`(departure_key, seat_number)`. Two riders cannot book the same seat — a
collision is surfaced as "seat just booked" and the map refreshes live
(`src/services/seatsRepo.ts`).

### Real payments (Razorpay)
`PaymentScreen` creates a Razorpay order via the `payments` Edge Function
(which holds the key secret server-side), opens checkout, and verifies the
signature server-side (`src/services/paymentsRepo.ts`,
`src/services/razorpayCheckout.ts`). Cash is recorded as a pending payment.
If Razorpay isn't configured, it falls back to a recorded payment so dev
flows still complete.

## Setup

```
npm install
cp .env.example .env   # fill in Supabase + (optionally) Razorpay key id
npx expo start -c
```

### Backend

```
# Apply migrations to your Supabase project
supabase db push

# Deploy the payments function and set its secrets (server-only)
supabase functions deploy payments
supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=...
```

> The Razorpay native checkout (`react-native-razorpay`) needs a custom dev
> build; in Expo Go the app falls back to recorded payments.

## Project map

```
src/
  navigation/   Stack navigator (auth gate)
  screens/      Auth, Home, MobilityOptions, RideDetail, ShuttleBooking,
                ShuttleSeat, Payment, ShuttleSuccess, DirectRideBooking,
                DirectRideStatus (live tracking), History, Profile, Help
  components/    BrandMark, GradientButton, GlassCard, RouteMap, ...
  context/       AuthContext, BookingHistoryContext, RouteDataContext
  services/      supabase, bookingsRepo, seatsRepo, tripsRepo,
                 paymentsRepo, razorpayCheckout, routeApi, directions
  types/         auth, database, routeNetwork
supabase/
  migrations/    profiles+bookings, drivers+trips+seats+payments
  functions/     send-sms-hook (OTP), payments (Razorpay)
```

## Security notes

- The Google Maps key in `src/services/directions.ts` should be moved to an
  env var and restricted by SHA-1 / bundle id in Google Cloud Console.
- The Supabase anon key is safe to ship (RLS-scoped). The Razorpay secret is
  never in the app — it lives only in the `payments` Edge Function.
