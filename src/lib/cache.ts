/**
 * Minimal in-process TTL cache for low-churn read payloads (team list, per-user
 * notification feeds). Keeps hot polling endpoints off the database within the
 * TTL window. Per-instance by design — a short TTL keeps cross-instance
 * staleness imperceptible, and `invalidateCache` lets rare admin mutations
 * flush it immediately on the instance that performed them.
 */

interface Entry {
  value: unknown;
  at: number;
}

const store = new Map<string, Entry>();
const MAX_ENTRIES = 800;

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) {
    return hit.value as T;
  }
  return fn()
    .then((value) => {
      store.set(key, { value, at: Date.now() });
      if (store.size > MAX_ENTRIES) {
        let oldestKey: string | null = null;
        let oldestAt = Infinity;
        for (const [k, v] of store) {
          if (v.at < oldestAt) {
            oldestAt = v.at;
            oldestKey = k;
          }
        }
        if (oldestKey) store.delete(oldestKey);
      }
      return value;
    })
    .catch((e) => {
      store.delete(key);
      throw e;
    });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}