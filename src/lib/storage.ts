import { supabase, isSupabaseEnabled } from './supabase';

/**
 * Unified storage layer: Supabase-first with localStorage fallback.
 *
 * Supabase table schema (run this SQL in your Supabase dashboard):
 *
 *   create table if not exists app_data (
 *     key text primary key,
 *     value jsonb not null,
 *     updated_at timestamptz default now()
 *   );
 *
 *   -- Enable Row Level Security
 *   alter table app_data enable row level security;
 *
 *   -- Allow all operations for now (single-user app)
 *   create policy "Allow all" on app_data for all using (true) with check (true);
 *
 * Each localStorage key maps to a row in app_data where:
 *   key   = the localStorage key string
 *   value = the JSON data
 */

const SUPABASE_TABLE = 'app_data';

/**
 * Load a value by key. Tries Supabase first, falls back to localStorage.
 * On Supabase success, also updates localStorage cache.
 */
export async function loadItem<T>(key: string, fallback: T): Promise<T> {
  // Try Supabase first
  if (isSupabaseEnabled() && supabase) {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (!error && data?.value !== undefined) {
        // Cache to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(data.value));
        } catch { /* localStorage full or unavailable */ }
        return data.value as T;
      }
    } catch {
      // Supabase unavailable, fall through to localStorage
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* corrupted data */ }

  return fallback;
}

/**
 * Save a value by key. Writes to both localStorage (sync) and Supabase (async).
 */
export async function saveItem<T>(key: string, value: T): Promise<void> {
  // Always write to localStorage immediately (fast, offline-capable)
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* localStorage full */ }

  // Write to Supabase in the background
  if (isSupabaseEnabled() && supabase) {
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
    } catch (e) {
      console.warn(`Failed to save '${key}' to Supabase:`, e);
    }
  }
}

/**
 * Remove a value by key from both stores.
 */
export async function removeItem(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }

  if (isSupabaseEnabled() && supabase) {
    try {
      await supabase.from(SUPABASE_TABLE).delete().eq('key', key);
    } catch { /* ignore */ }
  }
}

/**
 * Load all app data keys at once (batch load on mount).
 * Returns a Map of key -> value. Tries Supabase first for all keys,
 * falls back to localStorage per-key.
 */
export async function loadAllItems(keys: string[]): Promise<Map<string, unknown>> {
  const result = new Map<string, unknown>();

  if (isSupabaseEnabled() && supabase) {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_TABLE)
        .select('key, value')
        .in('key', keys);

      if (!error && data) {
        for (const row of data) {
          result.set(row.key, row.value);
          // Update localStorage cache
          try {
            localStorage.setItem(row.key, JSON.stringify(row.value));
          } catch { /* ignore */ }
        }
      }
    } catch {
      // Supabase unavailable, fall through
    }
  }

  // Fill in any missing keys from localStorage
  for (const key of keys) {
    if (!result.has(key)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          result.set(key, JSON.parse(raw));
        }
      } catch { /* ignore */ }
    }
  }

  return result;
}

/**
 * Save multiple key-value pairs at once (batch save).
 */
export async function saveAllItems(items: Record<string, unknown>): Promise<void> {
  // Write all to localStorage immediately
  for (const [key, value] of Object.entries(items)) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore */ }
  }

  // Batch upsert to Supabase
  if (isSupabaseEnabled() && supabase) {
    const rows = Object.entries(items).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    try {
      await supabase
        .from(SUPABASE_TABLE)
        .upsert(rows, { onConflict: 'key' });
    } catch (e) {
      console.warn('Failed to batch save to Supabase:', e);
    }
  }
}
