-- Phase 1: PostGIS + proximity-based dispatch

-- 1. Enable PostGIS in the extensions schema.
create extension if not exists postgis with schema extensions;

-- 2. drivers: generated geography column from existing lat/lng floats.
alter table public.drivers
  add column if not exists location extensions.geography(Point, 4326)
  generated always as (
    case
      when current_lng is not null and current_lat is not null
      then extensions.st_setsrid(
             extensions.st_makepoint(current_lng, current_lat), 4326
           )::extensions.geography
      else null
    end
  ) stored;

create index if not exists drivers_location_gix
  on public.drivers using gist (location);

create index if not exists drivers_status_ride_type_idx
  on public.drivers (status, ride_type);

-- 3. trips: generated geography for the pickup point.
alter table public.trips
  add column if not exists pickup_location extensions.geography(Point, 4326)
  generated always as (
    extensions.st_setsrid(
      extensions.st_makepoint(pickup_lng, pickup_lat), 4326
    )::extensions.geography
  ) stored;

create index if not exists trips_pickup_location_gix
  on public.trips using gist (pickup_location);

-- 4. trip_offers: sequential, auditable dispatch offers.
create table if not exists public.trip_offers (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  status      text not null default 'offered'
              check (status in ('offered', 'accepted', 'rejected', 'expired', 'cancelled')),
  distance_m  double precision,
  offered_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '15 seconds',
  responded_at timestamptz,
  unique (trip_id, driver_id)
);

create index if not exists trip_offers_trip_idx
  on public.trip_offers (trip_id, status);
create index if not exists trip_offers_driver_open_idx
  on public.trip_offers (driver_id, status)
  where status = 'offered';

alter table public.trip_offers enable row level security;

drop policy if exists "Drivers read own offers"   on public.trip_offers;
drop policy if exists "Drivers update own offers" on public.trip_offers;
drop policy if exists "Riders read offers for own trips" on public.trip_offers;

create policy "Drivers read own offers"
  on public.trip_offers for select
  to authenticated
  using ((select auth.uid()) = driver_id);

create policy "Drivers update own offers"
  on public.trip_offers for update
  to authenticated
  using ((select auth.uid()) = driver_id)
  with check ((select auth.uid()) = driver_id);

create policy "Riders read offers for own trips"
  on public.trip_offers for select
  to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = trip_offers.trip_id
        and t.rider_id = (select auth.uid())
    )
  );

-- 5. dispatch_find_drivers: nearest eligible drivers for a trip.
create or replace function public.dispatch_find_drivers(
  p_trip_id uuid,
  p_radius_m double precision default 5000,
  p_limit int default 5
)
returns table (
  driver_id  uuid,
  distance_m double precision
)
language sql
security definer
set search_path = public, extensions
as $$
  select d.id as driver_id,
         extensions.st_distance(d.location, t.pickup_location) as distance_m
  from public.trips t
  join public.drivers d
    on d.ride_type = t.ride_type
   and d.status = 'online'
   and d.location is not null
  where t.id = p_trip_id
    and extensions.st_dwithin(d.location, t.pickup_location, p_radius_m)
    and not exists (
      select 1 from public.trip_offers o
      where o.trip_id = p_trip_id
        and o.driver_id = d.id
        and o.status in ('offered', 'accepted')
    )
  order by d.location <-> t.pickup_location
  limit p_limit;
$$;

revoke execute on function public.dispatch_find_drivers(uuid, double precision, int) from public;
revoke execute on function public.dispatch_find_drivers(uuid, double precision, int) from anon;
revoke execute on function public.dispatch_find_drivers(uuid, double precision, int) from authenticated;
grant  execute on function public.dispatch_find_drivers(uuid, double precision, int) to service_role;
