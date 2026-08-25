"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
}

const POLL_MS = 12000;

/**
 * Live notification engine.
 * - Polls /api/notifications while the tab is open and fires a toast for every
 *   new notification instantly (no manual refresh needed).
 * - While the tab is hidden (user in another tab or app), incoming
 *   notifications are silently accumulated via background polling.
 * - The moment the user returns (Page Visibility API), a "Welcome back"
 *   summary toast fires with everything they missed.
 */
export default function NotificationWatcher() {
  const router = useRouter();
  const { toast } = useToast();
  const seenIds = useRef<Set<string> | null>(null);
  const missed = useRef<NotificationItem[]>([]);
  const hidden = useRef(false);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      if (stopped) return;
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const items: NotificationItem[] = data.items || [];

        // First run = baseline; don't toast history.
        if (seenIds.current === null) {
          seenIds.current = new Set(items.map((i) => i.id));
          return;
        }

        const fresh = items.filter((i) => !seenIds.current!.has(i.id));
        if (fresh.length === 0) return;

        for (const f of fresh) seenIds.current!.add(f.id);

        if (document.hidden) {
          // Tab inactive — track silently, alert on return.
          missed.current.push(...fresh);
        } else {
          for (const f of fresh.slice(0, 3)) {
            toast(f.title + (f.body ? ` — ${f.body}` : ""), "info");
          }
          if (fresh.length > 3) toast(`+${fresh.length - 3} more new updates.`, "info");
          router.refresh();
        }
      } catch {
        /* offline / unmount — ignore */
      }
    }

    function onVisibility() {
      const nowHidden = document.hidden;
      hidden.current = nowHidden;
      if (!nowHidden && missed.current.length > 0) {
        const count = missed.current.length;
        const first = missed.current[0];
        toast(
          `Welcome back — ${count} new update${count === 1 ? "" : "s"} while you were away.`,
          "success"
        );
        for (const m of missed.current.slice(0, 3)) {
          toast(m.title + (m.body ? ` — ${m.body}` : ""), "info");
        }
        if (count > 3) toast(`+${count - 3} more updates in your inbox.`, "info");
        missed.current = [];
        router.refresh();
      }
    }

    onVisibility();
    poll();
    const interval = setInterval(() => {
      if (!stopped) poll();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, toast]);

  return null;
}
