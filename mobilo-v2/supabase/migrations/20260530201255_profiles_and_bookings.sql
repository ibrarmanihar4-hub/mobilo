-- Mobilo Option A: Supabase Auth + profiles + bookings.

-- public.profiles
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_phone_idx on public.profiles (phone);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner"  on public.profiles;
drop policy if exists "Profiles are updatable by owner" on public.profiles;
drop policy if exists "Profiles are insertable by owner" on public.profiles;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Auto-create a profile row on auth.users insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on profile updates.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- public.bookings
create table if not exists public.bookings (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  booking_code text not null unique,
  ride_type    text not null check (ride_type in ('shuttle', 'cab', 'auto', 'moto')),
  title        text not null,
  route        text not null,
  time         text not null,
  fare         text not null,
  status       text not null check (status in ('Completed', 'Ongoing')),
  icon         text not null,
  accent       text not null,
  created_at   timestamptz not null default now()
);

create index if not exists bookings_user_id_idx
  on public.bookings (user_id, created_at desc);

alter table public.bookings enable row level security;

drop policy if exists "Users read their own bookings"   on public.bookings;
drop policy if exists "Users insert their own bookings" on public.bookings;
drop policy if exists "Users update their own bookings" on public.bookings;
drop policy if exists "Users delete their own bookings" on public.bookings;

create policy "Users read their own bookings"
  on public.bookings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert their own bookings"
  on public.bookings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update their own bookings"
  on public.bookings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete their own bookings"
  on public.bookings for delete
  to authenticated
  using ((select auth.uid()) = user_id);
