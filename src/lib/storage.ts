import { supabase, isSupabaseEnabled } from './supabase';
import { stripBlobs, rehydrateBlobs } from './blobBridge';

/**
 * Unified storage layer: Supabase-first with localStorage fallback.
 * Large binary data (base64 PDFs) is automatically offloaded to IndexedDB.
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

/** Keys that contain Document objects with potential base64 blob data. */
const BLOB_KEYS = new Set([
  'launcher-properties',
  'launcher-insurance',
  'launcher-invoices',
  'launcher-vehicles',
  'launcher-contracts',
  'launcher-correspondence-store',
]);

/**
 * Load a value by key. Tries Supabase first, falls back to localStorage.
 * On Supabase success, also updates localStorage cache.
 * Rehydrates blobs from IndexedDB for keys that contain documents.
 */
export async function loadItem<T>(key: string, fallback: T): Promise<T> {
  let value: T | undefined;

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
        value = data.value as T;
      }
    } catch {
      // Supabase unavailable, fall through to localStorage
    }
  }

  // Fallback to localStorage
  if (value === undefined) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) value = JSON.parse(raw) as T;
    } catch { /* corrupted data */ }
  }

  if (value === undefined) return fallback;

  // Rehydrate blobs from IndexedDB
  if (BLOB_KEYS.has(key)) {
    try {
      value = await rehydrateBlobs(value);
    } catch (e) {
      console.warn(`Failed to rehydrate blobs for '${key}':`, e);
    }
  }

  return value;
}

/**
 * Save a value by key. Writes to both localStorage (sync) and Supabase (async).
 * Strips blobs to IndexedDB for keys that contain documents.
 */
export async function saveItem<T>(key: string, value: T): Promise<void> {
  let toStore: T = value;

  // Strip blobs to IndexedDB
  if (BLOB_KEYS.has(key)) {
    try {
      toStore = await stripBlobs(key, value);
    } catch (e) {
      console.warn(`Failed to strip blobs for '${key}':`, e);
    }
  }

  // Write to localStorage
  try {
    localStorage.setItem(key, JSON.stringify(toStore));
  } catch (e) {
    console.warn(`Failed to save '${key}' to localStorage (likely quota exceeded):`, e);
  }

  // Write to Supabase in the background
  if (isSupabaseEnabled() && supabase) {
    try {
      await supabase
        .from(SUPABASE_TABLE)
        .upsert(
          { key, value: toStore, updated_at: new Date().toISOString() },
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
 * Rehydrates blobs from IndexedDB for keys that contain documents.
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

  // Rehydrate blobs for keys that contain documents
  for (const key of keys) {
    if (BLOB_KEYS.has(key) && result.has(key)) {
      try {
        const rehydrated = await rehydrateBlobs(result.get(key));
        result.set(key, rehydrated);
      } catch (e) {
        console.warn(`Failed to rehydrate blobs for '${key}':`, e);
      }
    }
  }

  return result;
}

/**
 * Save multiple key-value pairs at once (batch save).
 * Strips blobs to IndexedDB for keys that contain documents.
 */
export async function saveAllItems(items: Record<string, unknown>): Promise<void> {
  const toStore: Record<string, unknown> = {};

  // Strip blobs for keys that contain documents
  for (const [key, value] of Object.entries(items)) {
    if (BLOB_KEYS.has(key)) {
      try {
        toStore[key] = await stripBlobs(key, value);
      } catch (e) {
        console.warn(`Failed to strip blobs for '${key}':`, e);
        toStore[key] = value;
      }
    } else {
      toStore[key] = value;
    }
  }

  // Write all to localStorage
  const localStorageErrors: string[] = [];
  for (const [key, value] of Object.entries(toStore)) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      const msg = `Failed to save '${key}' to localStorage: ${(e as Error)?.message || e}`;
      console.warn(msg);
      localStorageErrors.push(msg);
    }
  }

  // Batch upsert to Supabase
  if (isSupabaseEnabled() && supabase) {
    const rows = Object.entries(toStore).map(([key, value]) => ({
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
      if (localStorageErrors.length > 0) {
        // Both storage backends failed — data loss risk
        throw new Error(`Storage save failed — neither localStorage nor Supabase could persist your data. ${localStorageErrors[0]}`);
      }
    }
  }

  // If Supabase isn't available and localStorage failed, alert the user
  if (!isSupabaseEnabled() && localStorageErrors.length > 0) {
    throw new Error(`localStorage quota likely exceeded. ${localStorageErrors[0]}`);
  }
}
