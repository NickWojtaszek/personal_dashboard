import { useState, useEffect, useRef, useCallback } from 'react';
import { loadItem, saveItem } from '../../../lib/storage';

/**
 * Universal storage hook backed by the dashboard's storage layer.
 * Uses Supabase when configured, falls back to localStorage.
 *
 * On mount, loads from storage (async). While loading, uses localStorage
 * snapshot for instant display. Writes go to both localStorage and Supabase.
 *
 * @param key - Storage key
 * @param initialValue - Default value if no data exists
 */
export function useStorage<T>(
  key: string,
  initialValue: T,
  _tableName?: string,
  _columnName?: string
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  // Initialize from localStorage synchronously for instant render
  const [data, setDataState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        // Merge objects to handle schema evolution
        if (
          typeof initialValue === 'object' && initialValue !== null &&
          !Array.isArray(initialValue) &&
          typeof parsed === 'object' && parsed !== null &&
          !Array.isArray(parsed)
        ) {
          return { ...initialValue, ...parsed };
        }
        return parsed;
      }
    } catch { /* corrupted localStorage */ }
    return initialValue;
  });

  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Load from storage layer (Supabase-first) on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await loadItem<T>(key, initialValue);
        if (!cancelled && mountedRef.current) {
          setDataState(prev => {
            // Merge loaded data with initial value for objects
            if (
              typeof initialValue === 'object' && initialValue !== null &&
              !Array.isArray(initialValue) &&
              typeof loaded === 'object' && loaded !== null &&
              !Array.isArray(loaded)
            ) {
              return { ...initialValue, ...loaded } as T;
            }
            return loaded;
          });
        }
      } catch {
        // Keep localStorage data on failure
      } finally {
        if (!cancelled && mountedRef.current) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [key]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // Setter that writes to both localStorage (sync) and Supabase (async)
  const setData = useCallback((value: T | ((val: T) => T)) => {
    setDataState(prev => {
      const next = value instanceof Function ? value(prev) : value;
      // Fire-and-forget save to storage layer
      saveItem(key, next).catch(() => {});
      return next;
    });
  }, [key]);

  return [data, setData, loading];
}
