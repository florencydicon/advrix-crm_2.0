"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Silent background poller.
 *
 * Fetches fresh data on a fixed interval and swaps the returned value into a
 * local state slot. It NEVER reloads the page, remounts the tree, or touches
 * unrelated state — so an open TaskModal/ContentModal (with in-progress typed
 * content/remarks) keeps its local state completely undisturbed. The returned
 * value only feeds the data arrays that derive the tables/cards.
 *
 * - Skips fetches while the tab is hidden (document.hidden).
 * - Failures are silent: a transient API error never interrupts the UI.
 *
 * @param initial   Value to render before (and identical after) the first fetch.
 * @param fetcher   Async function returning the latest payload. Must be
 *                  referentially stable or wrapped in useCallback; the hook
 *                  also keeps it in a ref so consumers can pass an inline fn.
 * @param intervalMs Poll cadence. Pass 0 to disable polling (initial only).
 */
export function useSilentPoll<T>(
  initial: T,
  fetcher: () => Promise<T>,
  intervalMs = 3000
): T {
  const [data, setData] = useState<T>(initial);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (intervalMs <= 0) return;

    let active = true;
    const run = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const next = await fetcherRef.current();
        if (active) setData(next);
      } catch {
        // Silent: keep the last good data; never disrupt the user.
      }
    };

    const id = window.setInterval(run, intervalMs);
    run();

    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, [intervalMs]);

  return data;
}