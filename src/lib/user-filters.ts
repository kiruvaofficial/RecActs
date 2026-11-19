/**
 * User-Level Filter Storage & Persistence
 * Persists filters per logged-in user in both localStorage (0ms instant hydration)
 * and PostgreSQL database via /api/user/filters (cloud persistence across devices).
 */

export interface UserFilterState<T = Record<string, any>> {
  filters: T;
  savedAt?: string;
  isCustomized?: boolean;
}

function getStorageKey(userId: string | undefined, viewKey: string): string {
  const safeUser = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'guest';
  return `recacts_filters_${safeUser}_${viewKey}`;
}

/**
 * Loads user filter preferences synchronously from localStorage, falling back to defaults.
 */
export function loadUserFilterPreferences<T extends Record<string, any>>(
  userId: string | undefined,
  viewKey: string,
  defaults: T
): T {
  if (typeof window === 'undefined') return defaults;
  try {
    const key = getStorageKey(userId, viewKey);
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.warn(`[UserFilters] Failed loading from localStorage for ${viewKey}:`, e);
  }
  return defaults;
}

/**
 * Saves user filter preferences immediately to localStorage and persists to API in background.
 */
export function saveUserFilterPreferences<T extends Record<string, any>>(
  userId: string | undefined,
  viewKey: string,
  filters: T
): void {
  if (typeof window === 'undefined') return;

  // 1. Instant local persistence
  try {
    const key = getStorageKey(userId, viewKey);
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (e) {
    console.warn(`[UserFilters] Failed saving to localStorage for ${viewKey}:`, e);
  }

  // 2. Background server persistence
  if (userId && userId !== 'guest') {
    fetch('/api/user/filters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewKey, filters }),
    }).catch((err) => {
      console.warn(`[UserFilters] Background server save failed for ${viewKey}:`, err);
    });
  }
}

/**
 * Clears user filter preferences from localStorage and database.
 */
export async function resetUserFilterPreferences(
  userId: string | undefined,
  viewKey: string
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const key = getStorageKey(userId, viewKey);
    localStorage.removeItem(key);
  } catch {}

  if (userId && userId !== 'guest') {
    try {
      await fetch(`/api/user/filters?view=${encodeURIComponent(viewKey)}`, {
        method: 'DELETE',
      });
    } catch {}
  }
}

/**
 * Asynchronously pulls saved filters from the server and applies them if different from defaults.
 */
export async function syncUserFilterPreferencesFromServer<T extends Record<string, any>>(
  userId: string | undefined,
  viewKey: string,
  onApply: (filters: T) => void
): Promise<void> {
  if (!userId || userId === 'guest') return;
  try {
    const res = await fetch(`/api/user/filters?view=${encodeURIComponent(viewKey)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.filters && typeof data.filters === 'object') {
        const key = getStorageKey(userId, viewKey);
        localStorage.setItem(key, JSON.stringify(data.filters));
        onApply(data.filters);
      }
    }
  } catch (e) {
    // Silent failover to localStorage
  }
}
