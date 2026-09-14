"use client";

/**
 * Thin wrapper around `fetch` that tracks per-URL ETags and returns `null`
 * on 304 Not Modified so pollers can skip processing unchanged payloads.
 */
export function createEtagFetcher() {
  const tags = new Map<string, string>();
  return async function fetchJson<T = unknown>(url: string): Promise<T | null> {
    const headers: Record<string, string> = {};
    const last = tags.get(url);
    if (last) headers["If-None-Match"] = last;
    try {
      const res = await fetch(url, { cache: "no-store", headers });
      const etag = res.headers.get("etag");
      if (etag) tags.set(url, etag);
      if (res.status === 304) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  };
}