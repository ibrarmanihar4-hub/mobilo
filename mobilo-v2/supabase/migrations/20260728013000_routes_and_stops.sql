-- Mobilo: shuttle route network management.
--
-- Adds the tables backing the admin "Route addition" feature (ported from
-- the legacy admin-dashboard, which stored routes against a separate
-- Firebase Functions API). Routes now live in Supabase alongside every
-- other admin-managed resource.
--
--   1. routes       - a named, directional shuttle route.
--   2. route_stops  - ordered stops belonging to a route (lat/lng + map url).
--
-- Route data is non-sensitive (public transit info the rider app also
-- needs), so reads are public. Writes are restricted to authenticated
-- users, consistent with every other admin-managed table in this project.

-- ---------------------------------------------------------------------------
-- 1. routes
-- ---------------------------------------------------------------------------
create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  direction   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.routes enable row level security;

drop policy if exists "Routes are publicly readable" on public.routes;
drop policy if exists "Authenticated users insert routes" on public.routes;
drop policy if exists "Authenticated users update routes" on public.routes;
drop policy if exists "Authenticated users delete routes" on public.routes;

create policy "Routes are publicly readable"
  on public.routes for select
  to anon, authenticated
  using (true);

create policy "Authenticated users insert routes"
  on public.routes for insert
  to authenticated
  with check (true);

create policy "Authenticated users update routes"
  on public.routes for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users delete routes"
  on public.routes for delete
  to authenticated
  using (true);

drop trigger if exists routes_set_updated_at on public.routes;
create trigger routes_set_updated_at
  before update on public.routes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. route_stops
-- ---------------------------------------------------------------------------
create table if not exists public.route_stops (
  id          uuid primary key default gen_random_uuid(),
  route_id    uuid not null references public.routes(id) on delete cascade,
  stop_order  integer not null,
  name        text not null,
  latitude    double precision not null,
  longitude   double precision not null,
  map_url     text,
  created_at  timestamptz not null default now(),
  unique (route_id, stop_order)
);

create index if not exists route_stops_route_idx
  on public.route_stops (route_id, stop_order);

alter table public.route_stops enable row level security;

drop policy if exists "Route stops are publicly readable" on public.route_stops;
drop policy if exists "Authenticated users insert route stops" on public.route_stops;
drop policy if exists "Authenticated users update route stops" on public.route_stops;
drop policy if exists "Authenticated users delete route stops" on public.route_stops;

create policy "Route stops are publicly readable"
  on public.route_stops for select
  to anon, authenticated
  using (true);

create policy "Authenticated users insert route stops"
  on public.route_stops for insert
  to authenticated
  with check (true);

create policy "Authenticated users update route stops"
  on public.route_stops for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users delete route stops"
  on public.route_stops for delete
  to authenticated
  using (true);
