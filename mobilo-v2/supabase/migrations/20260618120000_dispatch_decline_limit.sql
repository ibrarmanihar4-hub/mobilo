-- Dispatch decline limit + auto-cancel.
--
-- Problem: dispatch_find_drivers only excluded drivers with an open
-- ('offered') or 'accepted' offer, so a driver who *rejected* could be
-- offered the same trip again immediately. The rider app re-dispatched every
-- 5s, so a trip nobody wanted looped forever and never cancelled.
--
-- Fix:
--   1. Track how many times each driver has been offered a given trip
--      (`trip_offers.attempts`).
--   2. Stop offering a driver once they've been offered (and declined) twice.
--   3. When no eligible driver remains AND the trip was offered to at least
--      one driver, auto-cancel the request (cancelled_by = 'system').
--
-- A single SQL entry point `dispatch_offer_next` centralizes this so the
-- dispatch-trip Edge Function (foreground) and the pg_cron sweeper
-- (background) behave identically.

-- ---------------------------------------------------------------------------
-- 0. Track attempts per (trip, driver) offer.
-- ---------------------------------------------------------------------------
alter table public.trip_offers
  add column if not exists attempts int not null default 1;

-- ---------------------------------------------------------------------------
-- 1. Allow the system to be recorded as the canceller.
-- ---------------------------------------------------------------------------
alter table public.trips drop constraint if exists trips_cancelled_by_check;
alter table public.trips add constraint trips_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('rider', 'driver', 'system'));

-- ---------------------------------------------------------------------------
-- 2. dispatch_find_drivers: also exclude drivers who have already used up
--    their allowed attempts (declined twice) for this trip.
-- ---------------------------------------------------------------------------
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
  left join public.trip_offers o
    on o.trip_id = t.id
   and o.driver_id = d.id
  where t.id = p_trip_id
    and extensions.st_dwithin(d.location, t.pickup_location, p_radius_m)
    -- Eligible if the driver has never been offered this trip, OR their prior
    -- offer is no longer open/accepted and they still have attempts left.
    and (
      o.id is null
      or (o.status not in ('offered', 'accepted') and o.attempts < 2)
    )
  -- Fairness: offer to the driver with the FEWEST attempts so far, breaking
  -- ties by distance. This gives every driver their 1st offer before anyone
  -- gets their 2nd (round-robin), instead of pestering the nearest driver
  -- with the same request back-to-back.
  order by coalesce(o.attempts, 0) asc,
           d.location <-> t.pickup_location asc
  limit p_limit;
$$;

revoke execute on function public.dispatch_find_drivers(uuid, double precision, int) from public, anon, authenticated;
grant  execute on function public.dispatch_find_drivers(uuid, double precision, int) to service_role;

-- ---------------------------------------------------------------------------
-- 3. dispatch_offer_next: offer the trip to the next eligible driver, or
--    cancel the trip if everyone has declined their allowed attempts.
--
-- Returns a jsonb result describing what happened:
--   { "status": "offered", offer_id, driver_id, distance_m, expires_at }
--   { "status": "cancelled" }                 -- all drivers exhausted
--   { "status": "no_drivers" }                -- nobody was ever reachable
--   { "status": "noop", "trip_status": ... }  -- trip no longer 'requested'
--   { "status": "not_found" }
-- ---------------------------------------------------------------------------
create or replace function public.dispatch_offer_next(
  p_trip_id uuid,
  p_radius_m double precision default 8000,
  p_offer_ttl_seconds int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_trip        record;
  v_driver      record;
  v_offer       record;
  v_expires     timestamptz;
  v_offer_count int;
begin
  select id, status into v_trip from public.trips where id = p_trip_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_trip.status <> 'requested' then
    return jsonb_build_object('status', 'noop', 'trip_status', v_trip.status);
  end if;

  -- Free up offers this trip's drivers ignored: an offer left 'offered' past
  -- its expiry is marked 'expired' right now (instead of waiting up to a
  -- minute for the cron sweeper). This lets the offer roll to the next driver
  -- on this same dispatch call.
  update public.trip_offers
     set status = 'expired', responded_at = now()
   where trip_id = p_trip_id
     and status = 'offered'
     and expires_at < now();

  -- If a driver is still actively deciding on a live (unexpired) offer, leave
  -- it alone - don't double-offer and don't cancel out from under them.
  if exists (
    select 1 from public.trip_offers
    where trip_id = p_trip_id
      and status = 'offered'
      and expires_at > now()
  ) then
    return jsonb_build_object('status', 'pending');
  end if;

  -- Nearest eligible driver (excludes open/accepted offers and drivers who
  -- have already been offered twice).
  select * into v_driver
  from public.dispatch_find_drivers(p_trip_id, p_radius_m, 1);

  if found then
    v_expires := now() + make_interval(secs => p_offer_ttl_seconds);
    insert into public.trip_offers (
      trip_id, driver_id, distance_m, status, offered_at, expires_at,
      responded_at, attempts
    )
    values (
      p_trip_id, v_driver.driver_id, v_driver.distance_m, 'offered', now(),
      v_expires, null, 1
    )
    on conflict (trip_id, driver_id) do update
      set status      = 'offered',
          distance_m  = excluded.distance_m,
          offered_at  = now(),
          expires_at  = v_expires,
          responded_at = null,
          attempts    = public.trip_offers.attempts + 1
    returning * into v_offer;

    return jsonb_build_object(
      'status', 'offered',
      'offer_id', v_offer.id,
      'driver_id', v_offer.driver_id,
      'distance_m', v_offer.distance_m,
      'expires_at', v_offer.expires_at
    );
  end if;

  -- No eligible driver and nobody is currently deciding. If the trip was
  -- offered to at least one driver, they have all declined/ignored their
  -- allowed attempts -> cancel the request. If nobody was ever reachable,
  -- keep waiting (a driver may yet come online).
  select count(*) into v_offer_count
  from public.trip_offers where trip_id = p_trip_id;

  if v_offer_count > 0 then
    update public.trips
       set status = 'cancelled', cancelled_by = 'system'
     where id = p_trip_id and status = 'requested';
    return jsonb_build_object('status', 'cancelled');
  end if;

  return jsonb_build_object('status', 'no_drivers');
end;
$$;

revoke execute on function public.dispatch_offer_next(uuid, double precision, int) from public, anon, authenticated;
grant  execute on function public.dispatch_offer_next(uuid, double precision, int) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Route the background cron sweeper through the same logic so it also
--    enforces the decline limit and cancels exhausted trips.
-- ---------------------------------------------------------------------------
create or replace function public.redispatch_waiting_trips(
  p_radius_m double precision default 8000,
  p_offer_ttl_seconds int default 30
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_trip  record;
  v_count int := 0;
  v_res   jsonb;
begin
  for v_trip in
    select t.id
    from public.trips t
    where t.status = 'requested'
      and not exists (
        select 1 from public.trip_offers o
        where o.trip_id = t.id
          and o.status in ('offered', 'accepted')
      )
  loop
    v_res := public.dispatch_offer_next(v_trip.id, p_radius_m, p_offer_ttl_seconds);
    if v_res->>'status' = 'offered' then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.redispatch_waiting_trips(double precision, int) from public, anon, authenticated;
grant  execute on function public.redispatch_waiting_trips(double precision, int) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Realtime: broadcast trip_offers changes.
--
-- ROOT CAUSE of "I have to refresh to see offers" and "the offer never moves
-- to the next driver": trip_offers was never added to the supabase_realtime
-- publication, so the driver app's subscribeToMyOffers (postgres_changes on
-- trip_offers) never received INSERT/UPDATE events. The dispatcher correctly
-- rolled the offer to the next driver in the DB, but that driver's app was
-- never notified. Adding the table to the publication makes offers appear and
-- roll over live, without any manual refresh.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.trip_offers;
  exception when duplicate_object then null;
  end;
end $$;
