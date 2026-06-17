-- Phase 2: authorize the per-trip live-location broadcast channel.
--
-- Topic format (must match both apps): 'trip-loc:{trip_id}'.
-- Only two parties may join a trip's location channel:
--   - the rider who owns the trip (receives the driver's position)
--   - the driver assigned to the trip (sends their position)
--
-- These policies on realtime.messages take effect once channels are joined
-- with { private: true } AND project-wide 'Allow public access' is disabled
-- in Realtime Settings. Until then they're harmless (public channels ignore
-- them). We add them now so the security model is ready.

-- Helper: extract the trip id from the realtime topic 'trip-loc:<uuid>'.
create or replace function public.trip_id_from_topic(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic like 'trip-loc:%'
    then nullif(split_part(p_topic, ':', 2), '')::uuid
    else null
  end;
$$;

-- READ: rider or assigned driver may receive broadcasts on the trip channel.
drop policy if exists "trip participants can read location broadcast" on realtime.messages;
create policy "trip participants can read location broadcast"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.trips t
      where t.id = public.trip_id_from_topic((select realtime.topic()))
        and ((select auth.uid()) = t.rider_id
             or (select auth.uid()) = t.driver_id)
    )
  );

-- WRITE: only the assigned driver may send their location on the trip channel.
drop policy if exists "assigned driver can send location broadcast" on realtime.messages;
create policy "assigned driver can send location broadcast"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.trips t
      where t.id = public.trip_id_from_topic((select realtime.topic()))
        and (select auth.uid()) = t.driver_id
    )
  );
