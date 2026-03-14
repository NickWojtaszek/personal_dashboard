-- Supabase schema for Personal Dashboard
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

-- Key-value document store for all app data
create table if not exists app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table app_data enable row level security;

-- Allowlist of authorized users (manage via Supabase dashboard)
create table if not exists allowed_users (
  email text primary key,
  added_at timestamptz default now()
);

alter table allowed_users enable row level security;

-- Allow any authenticated user to read the allowlist (needed for login check)
create policy "Authenticated users can check allowlist" on allowed_users
  for select
  using (auth.role() = 'authenticated');

-- Helper function to check allowlist without RLS recursion
create or replace function is_allowed_user()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from allowed_users where email = auth.email()
  );
$$;

-- Allow allowed users to manage the allowlist (add/remove users from the app)
create policy "Allowed users can manage allowlist" on allowed_users
  for all
  using (is_allowed_user())
  with check (is_allowed_user());

-- Only allowed users can access app data
drop policy if exists "Allow all operations" on app_data;
create policy "Allowed users only" on app_data
  for all
  using (is_allowed_user())
  with check (is_allowed_user());

-- Index for faster lookups by key
create index if not exists idx_app_data_key on app_data (key);
