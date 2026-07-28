-- Driver KYC: persists the full KYC submission from the driver app.
--
-- 1. driver_kyc table  – one row per driver, upserted on each submission.
-- 2. Storage bucket    – "driver-kyc" (private) for all document images.
--
-- RLS: a driver can only read/write their own KYC row and their own storage
-- objects. No other user (including other drivers) can access another driver's
-- KYC data. Admins can read/update via the service-role key.

-- ---------------------------------------------------------------------------
-- 1. driver_kyc table
-- ---------------------------------------------------------------------------
create table if not exists public.driver_kyc (
  -- identity
  driver_id               uuid primary key references public.drivers(id) on delete cascade,
  status                  text not null default 'pending'
                            check (status in ('pending', 'approved', 'rejected')),
  rejection_reason        text,

  -- personal info
  full_name               text,
  dob                     text,
  gender                  text check (gender in ('male', 'female', 'other')),
  address                 text,
  emergency_contact       text,

  -- aadhaar
  aadhaar_number          text,
  aadhaar_front_url       text,
  aadhaar_back_url        text,

  -- pan
  pan_number              text,
  pan_url                 text,

  -- driving license
  license_number          text,
  license_expiry          text,
  license_front_url       text,
  license_back_url        text,

  -- profile photo
  selfie_url              text,

  -- vehicle
  vehicle_type            text check (vehicle_type in ('car', 'bike', 'auto', 'bus')),
  vehicle_number          text,
  vehicle_model           text,
  vehicle_color           text,
  rc_number               text,
  rc_front_url            text,
  rc_back_url             text,

  -- insurance
  insurance_number        text,
  insurance_expiry        text,
  insurance_url           text,

  -- puc
  puc_number              text,
  puc_expiry              text,
  puc_url                 text,

  -- bank details
  account_holder_name     text,
  bank_name               text,
  account_number          text,
  ifsc_code               text,
  passbook_url            text,

  -- timestamps
  submitted_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists driver_kyc_status_idx on public.driver_kyc (status);

alter table public.driver_kyc enable row level security;

-- Drop old policies so re-running the migration is safe.
drop policy if exists "Driver reads own KYC"   on public.driver_kyc;
drop policy if exists "Driver inserts own KYC" on public.driver_kyc;
drop policy if exists "Driver updates own KYC" on public.driver_kyc;

-- A driver can read only their own KYC row.
create policy "Driver reads own KYC"
  on public.driver_kyc for select
  to authenticated
  using ((select auth.uid()) = driver_id);

-- A driver can insert their own KYC row.
create policy "Driver inserts own KYC"
  on public.driver_kyc for insert
  to authenticated
  with check ((select auth.uid()) = driver_id);

-- A driver can update their own KYC row (e.g. re-submission after rejection).
create policy "Driver updates own KYC"
  on public.driver_kyc for update
  to authenticated
  using  ((select auth.uid()) = driver_id)
  with check ((select auth.uid()) = driver_id);

-- Keep updated_at in sync automatically.
drop trigger if exists driver_kyc_set_updated_at on public.driver_kyc;
create trigger driver_kyc_set_updated_at
  before update on public.driver_kyc
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Storage bucket: driver-kyc
--    Private bucket — images served only via signed URLs from the driver app.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-kyc',
  'driver-kyc',
  false,                   -- private: no public URLs
  10485760,                -- 10 MB per file (selfies & docs can be large)
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Storage RLS: drivers can upload/read/delete only their own objects.
-- Objects are stored under the path: {driver_uid}/{filename}

drop policy if exists "Driver uploads own KYC images"  on storage.objects;
drop policy if exists "Driver reads own KYC images"    on storage.objects;
drop policy if exists "Driver deletes own KYC images"  on storage.objects;

create policy "Driver uploads own KYC images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'driver-kyc'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Driver reads own KYC images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'driver-kyc'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Driver deletes own KYC images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'driver-kyc'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
