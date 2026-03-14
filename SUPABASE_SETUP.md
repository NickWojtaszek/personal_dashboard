# Supabase Integration Guide

## Overview

The app has a unified storage layer (`src/lib/storage.ts`) that supports both localStorage and Supabase. When Supabase env vars are set, data syncs to the cloud with localStorage as an offline cache. Without them, the app works exactly as before using localStorage only.

## Architecture

### Storage Layer (`src/lib/storage.ts`)

- **`loadItem(key, fallback)`** - Load a single value (Supabase-first, localStorage fallback)
- **`saveItem(key, value)`** - Save to both localStorage (sync) and Supabase (async)
- **`removeItem(key)`** - Delete from both stores
- **`loadAllItems(keys)`** - Batch load on mount (single Supabase query for all keys)
- **`saveAllItems(items)`** - Batch save (single Supabase upsert)

### Supabase Client (`src/lib/supabase.ts`)

Only initializes if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present. Exports `isSupabaseEnabled()` for conditional logic.

### Database Schema

Single table `app_data` with key-value rows (JSONB). Each localStorage key maps to one row.

## Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon public key** from Settings > API

### 2. Run Schema SQL

In the Supabase SQL Editor, run the contents of `supabase/schema.sql`:

```sql
create table if not exists app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table app_data enable row level security;

create policy "Allow all operations" on app_data
  for all
  using (true)
  with check (true);

create index if not exists idx_app_data_key on app_data (key);
```

### 3. Set Environment Variables

**Locally** (`.env.local`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**On Railway** (dashboard > Variables):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> Note: These are `VITE_`-prefixed so Vite exposes them to the client bundle via `import.meta.env`.

### 4. Rebuild & Deploy

Railway will auto-deploy on push. For manual rebuild:
```bash
npm run build
```

## Data Model

All 16 localStorage keys map to rows in `app_data`:

| Key | Data Type | Source Component |
|-----|-----------|-----------------|
| `launcher-apps` | `AppInfo[]` | App.tsx |
| `launcher-app-groups` | `string[]` | App.tsx |
| `launcher-projects` | `ProjectInfo[]` | App.tsx |
| `launcher-project-groups` | `string[]` | App.tsx |
| `launcher-properties` | `PropertyInfo[]` | App.tsx |
| `launcher-property-groups` | `string[]` | App.tsx |
| `launcher-insurance` | `InsuranceInfo[]` | App.tsx |
| `launcher-insurance-groups` | `string[]` | App.tsx |
| `launcher-invoices` | `InvoiceInfo[]` | App.tsx |
| `launcher-invoice-groups` | `string[]` | App.tsx |
| `launcher-invoice-locations` | `string[]` | App.tsx |
| `launcher-vehicles` | `VehicleInfo[]` | App.tsx |
| `launcher-vehicle-groups` | `string[]` | App.tsx |
| `launcher-shopping-items` | `ShoppingItem[]` | App.tsx |
| `launcher-shopping-categories` | `string[]` | App.tsx |
| `radreport-edits` | `{editedSections, editedLabels, ...}` | RadiologyTemplatesPage.tsx |

Theme (`app-theme`) stays in localStorage only (no need for cloud sync).

## Security Notes

- The current RLS policy allows all operations (single-user app)
- If adding multi-user support later, replace the policy with auth-based rules:
  ```sql
  create policy "Users own data" on app_data
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  ```
  (Would require adding a `user_id` column and Supabase Auth)

## Offline Behavior

- localStorage is always written to first (synchronous, instant)
- Supabase writes happen in the background (async)
- If Supabase is unavailable, the app continues working with localStorage
- On next load, Supabase data takes priority (cloud is source of truth)
