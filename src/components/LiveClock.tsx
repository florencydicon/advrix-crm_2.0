"use client";

import { useEffect, useState } from "react";

/**
 * Local tick that only re-renders the consuming leaf component — used so the
 * attendance view's 1s clock no longer re-renders the entire page every second.
 */
function useNow(intervalMs = 1000): Date {
  const [n, setN] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setN(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return n;
}

/** Live date + time header (scoped to itself so parents stay still while it ticks). */
export function LiveClock() {
  const now = useNow();
  return (
    <>
      {now.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      {" · "}
      {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </>
  );
}

/** Live elapsed-minutes readout since a timestamp (lunch-break running timer). */
export function LiveElapsed({ since }: { since: string }) {
  const now = useNow(10000);
  return <>{Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 60000))}m</>;
}