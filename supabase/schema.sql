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

-- Single-user app: allow all operations
-- Replace with auth-based policies if you add multi-user support later
create policy "Allow all operations" on app_data
  for all
  using (true)
  with check (true);

-- Index for faster lookups by key (primary key already indexed, but this helps with IN queries)
create index if not exists idx_app_data_key on app_data (key);
