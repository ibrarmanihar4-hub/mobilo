-- Server-side dispatch sweeper: expires lapsed offers and rolls waiting trips
-- to the next nearest driver via pg_cron. Keeps dispatch alive even when the
-- rider app is backgrounded/closed.

create extension if not exists pg_cron with schema extensions;

-- Mark expired offers so dispatch_find_drivers stops excluding those drivers.
create or replace function public.expire_stale_offers()
returns void
language sql
security definer
set search_path = public
as $$
  update public.trip_offers
     set status = 'expired', responded_at = now()
   where status = 'offered'
     and expires_at < now();
$$;

-- Re-dispatch trips still 'requested' with no open offer: offer the nearest
-- eligible driver a fresh, time-boxed offer. SQL twin of the dispatch-trip
-- Edge Function, used by the cron loop (no JWT context).
create or replace function public.redispatch_waiting_trips(
  p_radius_m double precision default 8000,
  p_offer_ttl_seconds int default 15
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_trip   record;
  v_driver record;
  v_count  int := 0;
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
    select * into v_driver
    from public.dispatch_find_drivers(v_trip.id, p_radius_m, 1);

    if found then
      insert into public.trip_offers (trip_id, driver_id, distance_m, status, expires_at)
      values (
        v_trip.id,
        v_driver.driver_id,
        v_driver.distance_m,
        'offered',
        now() + make_interval(secs => p_offer_ttl_seconds)
      )
      on conflict (trip_id, driver_id) do nothing;
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke execute on function public.expire_stale_offers() from public, anon, authenticated;
revoke execute on function public.redispatch_waiting_trips(double precision, int) from public, anon, authenticated;
grant  execute on function public.expire_stale_offers() to service_role;
grant  execute on function public.redispatch_waiting_trips(double precision, int) to service_role;

-- pg_cron's finest granularity is 1 minute. The client-side retry in
-- DirectRideStatusScreen covers sub-minute snappiness in the foreground;
-- this cron is the robust background fallback.
select cron.schedule(
  'mobilo-dispatch-sweep',
  '* * * * *',
  $cron$
    select public.expire_stale_offers();
    select public.redispatch_waiting_trips();
  $cron$
);
