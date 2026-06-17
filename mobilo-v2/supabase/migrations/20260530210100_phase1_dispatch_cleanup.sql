-- Cleanup from Phase 1 advisors.

-- 1. Drop duplicate index: drivers_status_ride_type_idx supersedes the
--    status-only drivers_status_idx.
drop index if exists public.drivers_status_idx;

-- 2. Merge the two permissive SELECT policies on trip_offers into one.
drop policy if exists "Drivers read own offers"        on public.trip_offers;
drop policy if exists "Riders read offers for own trips" on public.trip_offers;

create policy "Read offers for own trip or as offered driver"
  on public.trip_offers for select
  to authenticated
  using (
    (select auth.uid()) = driver_id
    or exists (
      select 1 from public.trips t
      where t.id = trip_offers.trip_id
        and t.rider_id = (select auth.uid())
    )
  );
