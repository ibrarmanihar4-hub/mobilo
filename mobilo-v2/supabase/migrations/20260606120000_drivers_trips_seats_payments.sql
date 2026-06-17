-- Mobilo: real-time ride backbone.
--
-- Adds the tables that turn the previously-faked flows into real systems:
--   1. profiles.role        - distinguish riders from drivers
--   2. drivers              - driver identity, vehicle, status, live location
--   3. trips                - direct-ride lifecycle (request -> assign -> ... -> complete)
--   4. seat_reservations    - real shuttle seat inventory (no double-booking)
--   5. payments             - payment records tied to a booking/trip
--
-- Realtime is enabled on `drivers` and `trips` so the rider app can watch
-- driver location and trip status change live, and the driver app can watch
-- incoming requests.

-- ---------------------------------------------------------------------------
-- 0. Roles
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'rider'
  check (role in ('rider', 'driver'));

-- ---------------------------------------------------------------------------
-- 1. Drivers
-- ---------------------------------------------------------------------------
create table if not exists public.drivers (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default 'Mobilo Driver',
  phone           text,
  ride_type       text not null default 'cab'
                    check (ride_type in ('cab', 'auto', 'moto', 'shuttle')),
  vehicle_label   text not null default '',
  vehicle_plate   text not null default '',
  rating          numeric(2,1) not null default 5.0,
  status          text not null default 'offline'
                    check (status in ('offline', 'online', 'on_trip')),
  -- live position, updated frequently while online
  current_lat     double precision,
  current_lng     double precision,
  heading         double precision,
  location_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists drivers_status_idx on public.drivers (status, ride_type);

alter table public.drivers enable row level security;

drop policy if exists "Drivers row readable by authenticated" on public.drivers;
drop policy if exists "Driver manages own row"               on public.drivers;
drop policy if exists "Driver inserts own row"               on public.drivers;

-- Any authenticated user can read driver rows (riders need to see their
-- assigned driver's name/vehicle/rating/location). Live location is only
-- meaningful while assigned, but exposing basic driver info is acceptable
-- and matches how Ola/Uber show driver details.
create policy "Drivers row readable by authenticated"
  on public.drivers for select
  to authenticated
  using (true);

create policy "Driver inserts own row"
  on public.drivers for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Driver manages own row"
  on public.drivers for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop trigger if exists drivers_set_updated_at on public.drivers;
create trigger drivers_set_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Trips (direct rides: cab / auto / moto)
-- ---------------------------------------------------------------------------
create table if not exists public.trips (
  id             uuid primary key default gen_random_uuid(),
  booking_code   text not null unique,
  rider_id       uuid not null references auth.users(id) on delete cascade,
  driver_id      uuid references public.drivers(id) on delete set null,
  ride_type      text not null check (ride_type in ('cab', 'auto', 'moto')),
  status         text not null default 'requested'
                   check (status in (
                     'requested',   -- rider asked, waiting for a driver
                     'assigned',    -- driver accepted, heading to pickup
                     'arriving',    -- driver near pickup
                     'ongoing',     -- rider on board
                     'completed',
                     'cancelled'
                   )),
  pickup_name    text not null,
  pickup_lat     double precision not null,
  pickup_lng     double precision not null,
  drop_name      text not null,
  drop_lat       double precision not null,
  drop_lng       double precision not null,
  fare           integer not null,
  otp            text not null,
  payment_status text not null default 'pending'
                   check (payment_status in ('pending', 'paid', 'failed')),
  cancelled_by   text check (cancelled_by in ('rider', 'driver')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists trips_rider_idx  on public.trips (rider_id, created_at desc);
create index if not exists trips_driver_idx on public.trips (driver_id, created_at desc);
create index if not exists trips_open_idx
  on public.trips (ride_type, status)
  where status = 'requested';

alter table public.trips enable row level security;

drop policy if exists "Rider reads own trips"          on public.trips;
drop policy if exists "Rider creates own trips"        on public.trips;
drop policy if exists "Rider updates own trips"        on public.trips;
drop policy if exists "Driver reads open or own trips" on public.trips;
drop policy if exists "Driver updates assigned trips"  on public.trips;

-- Rider: full control over their own trips.
create policy "Rider reads own trips"
  on public.trips for select
  to authenticated
  using ((select auth.uid()) = rider_id);

create policy "Rider creates own trips"
  on public.trips for insert
  to authenticated
  with check ((select auth.uid()) = rider_id);

create policy "Rider updates own trips"
  on public.trips for update
  to authenticated
  using ((select auth.uid()) = rider_id)
  with check ((select auth.uid()) = rider_id);

-- Driver: can see unassigned open requests of their ride type, plus any
-- trip already assigned to them.
create policy "Driver reads open or own trips"
  on public.trips for select
  to authenticated
  using (
    driver_id = (select auth.uid())
    or (
      status = 'requested'
      and exists (
        select 1 from public.drivers d
        where d.id = (select auth.uid())
          and d.ride_type = public.trips.ride_type
      )
    )
  );

-- Driver: can claim an open trip (set themselves as driver) and progress
-- the status of trips assigned to them.
create policy "Driver updates assigned trips"
  on public.trips for update
  to authenticated
  using (
    exists (select 1 from public.drivers d where d.id = (select auth.uid()))
    and (driver_id is null or driver_id = (select auth.uid()))
  )
  with check (driver_id = (select auth.uid()));

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Seat reservations (shuttle) - real inventory
-- ---------------------------------------------------------------------------
-- A departure is identified by a stable string key built on the client from
-- route id + ISO departure time (e.g. "route-kmt-1|2026-06-06T18:30").
-- The unique constraint on (departure_key, seat_number) is what actually
-- prevents two riders from booking the same seat.
create table if not exists public.seat_reservations (
  id            uuid primary key default gen_random_uuid(),
  departure_key text not null,
  seat_number   integer not null check (seat_number between 1 and 60),
  user_id       uuid not null references auth.users(id) on delete cascade,
  booking_code  text,
  created_at    timestamptz not null default now(),
  unique (departure_key, seat_number)
);

create index if not exists seat_reservations_departure_idx
  on public.seat_reservations (departure_key);
create index if not exists seat_reservations_user_idx
  on public.seat_reservations (user_id, created_at desc);

alter table public.seat_reservations enable row level security;

drop policy if exists "Seats readable by authenticated" on public.seat_reservations;
drop policy if exists "Rider books own seats"           on public.seat_reservations;
drop policy if exists "Rider releases own seats"        on public.seat_reservations;

-- Anyone authenticated can read which seats are taken for a departure (so
-- the seat map can grey them out). No PII is exposed beyond user_id.
create policy "Seats readable by authenticated"
  on public.seat_reservations for select
  to authenticated
  using (true);

create policy "Rider books own seats"
  on public.seat_reservations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Rider releases own seats"
  on public.seat_reservations for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 4. Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  booking_code     text not null,
  amount           integer not null,          -- in paise for gateway accuracy
  currency         text not null default 'INR',
  method           text not null,             -- upi / card / wallet / cash
  gateway          text not null default 'razorpay',
  gateway_order_id text,
  gateway_payment_id text,
  status           text not null default 'created'
                     check (status in ('created', 'paid', 'failed', 'refunded')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_booking_idx on public.payments (booking_code);

alter table public.payments enable row level security;

drop policy if exists "User reads own payments"   on public.payments;
drop policy if exists "User inserts own payments" on public.payments;

create policy "User reads own payments"
  on public.payments for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "User inserts own payments"
  on public.payments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Realtime
-- ---------------------------------------------------------------------------
-- Add the tables riders/drivers need to watch live to the realtime
-- publication. Wrapped so re-running the migration is safe.
do $$
begin
  begin
    alter publication supabase_realtime add table public.trips;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.drivers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.seat_reservations;
  exception when duplicate_object then null;
  end;
end $$;
