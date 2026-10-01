"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCheck, Inbox, Clock, FileText, Briefcase, CalendarOff, Settings, ListFilter } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types";
import { createEtagFetcher } from "@/lib/clientFetch";
import Pagination, { clampPageSize, type PageSize } from "@/components/Pagination";

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; bg: string; ring: string }> = {
  task:       { label: "Task",       icon: <FileText      className="h-4 w-4" />, bg: "bg-brand-300/10",   ring: "ring-brand-300/30" },
  project:    { label: "Project",    icon: <Briefcase     className="h-4 w-4" />, bg: "bg-violet-400/10", ring: "ring-violet-400/30" },
  leave:      { label: "Leave",      icon: <CalendarOff   className="h-4 w-4" />, bg: "bg-amber-400/10",  ring: "ring-amber-400/30" },
  attendance: { label: "Attendance", icon: <Clock         className="h-4 w-4" />, bg: "bg-emerald-400/10",ring: "ring-emerald-400/30" },
  system:     { label: "System",     icon: <Settings      className="h-4 w-4" />, bg: "bg-white/10",      ring: "ring-white/20" },
};

const TYPE_COLORS: Record<string, string> = {
  task: "text-brand-300",
  project: "text-violet-300",
  leave: "text-amber-300",
  attendance: "text-emerald-300",
  system: "text-slate-300",
};

function parseDate(dateStr: string | Date | null | undefined): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  if (typeof dateStr !== "string") {
    try { const d = new Date(dateStr as any); if (!isNaN(d.getTime())) return d; } catch {}
    return null;
  }
  let s = dateStr.trim();
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
  if (!s.endsWith("Z") && !s.match(/[+-]\d{2}:?\d{2}$/) && !s.match(/[+-]\d{4}$/)) {
    if (!s.includes("Z")) s = s + "Z";
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const d2 = new Date(dateStr);
  return isNaN(d2.getTime()) ? null : d2;
}
function timeAgo(dateStr: string | Date | null | undefined) {
  const d = parseDate(dateStr as any);
  if (!d) return String(dateStr ?? "");
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
function formatIST(dateStr: string | Date | null | undefined) {
  const d = parseDate(dateStr as any);
  if (!d) return String(dateStr ?? "");
  try {
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch { return String(dateStr ?? ""); }
}

export default function UpdatesView({
  initialItems,
  initialTotal,
  initialPage,
  initialPageSize,
  typeCounts = {},
}: {
  initialItems: Notification[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  typeCounts?: Record<string, { total: number; unread: number }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const typeFilter = searchParams.get("type") || "all";

  const [page, setPage] = useState(initialPage || 1);
  const [pageSize, setPageSize] = useState<PageSize>(clampPageSize(initialPageSize || 25));
  const [total, setTotal] = useState(initialTotal || 0);
  const [items, setItems] = useState<Notification[]>(initialItems);
  const [loading, setLoading] = useState(false);

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  // Force re-render every minute so timeAgo stays accurate without hard refresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 60000);
    return () => clearInterval(id);
  }, []);
  const TOASTED_KEY = "advrix.toastedIds";
  // Hydrate persisted read set so Mark all remains sticky across refresh for all roles
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TOASTED_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr) && arr.length) {
          setReadIds((prev) => {
            const next = new Set(prev);
            arr.forEach((id) => next.add(id));
            return next;
          });
        }
      }
    } catch {}
  }, []);

  const isRead = (n: any) => (n.read === true || (n as any).isRead === true) || readIds.has(n.id);
  const unreadOnPage = items.filter((n) => !isRead(n)).length;

  // Live sync: refresh ONLY the current window (same size as the visible page)
  // instead of the previous limit=200 full dump. Piggybacks on the bell's
  // 30s "advrix:notifications-polled" event + refetch on tab focus.
  useEffect(() => {
    let cancelled = false;
    const fetchJson = createEtagFetcher();
    async function sync() {
      if (document.hidden || cancelled || loading) return;
      const qs = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      if (typeFilter !== "all") qs.set("type", typeFilter);
      if (filter === "unread") qs.set("unread", "true");
      const data = await fetchJson<{ items: Notification[]; total: number }>(`/api/notifications?${qs.toString()}`);
      if (data === null || cancelled || !Array.isArray(data.items)) return;
      setItems(data.items);
      setTotal(data.total ?? 0);
    }
    const once = window.setTimeout(sync, 2500);
    const onBellSync = () => { sync(); };
    const onVisible = () => { if (!document.hidden) sync(); };
    window.addEventListener("advrix:notifications-polled", onBellSync);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      window.clearTimeout(once);
      window.removeEventListener("advrix:notifications-polled", onBellSync);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [page, pageSize, filter, typeFilter, loading]);

  /** Navigate with new query params — server re-renders only the new window. */
  function pushParams(mutate: (sp: URLSearchParams) => void) {
    const sp = new URLSearchParams(searchParams.toString());
    mutate(sp);
    const qs = sp.toString();
    router.push(`/updates${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function setFilter(value: string) {
    setPage(1);
    pushParams((sp) => {
      if (value === "all") sp.delete("filter");
      else sp.set("filter", value);
      sp.delete("page");
    });
  }

  function setTypeFilter(value: string) {
    setPage(1);
    pushParams((sp) => {
      if (value === "all") sp.delete("type");
      else sp.set("type", value);
      sp.delete("page");
    });
  }

  /** Clear every filter and show the full, unfiltered list from page 1. */
  function clearFilters() {
    setPage(1);
    router.push("/updates", { scroll: false });
  }

  function goToPage(p: number, size?: PageSize) {
    const s = size ?? pageSize;
    setLoading(true);
    setPage(p);
    if (size) setPageSize(size);
    pushParams((sp) => {
      if (p <= 1) sp.delete("page");
      else sp.set("page", String(p));
      if (s === 25) sp.delete("size");
      else sp.set("size", String(s));
    });
  }

  function changePageSize(s: PageSize) {
    goToPage(1, s);
  }

  const hasFilters = filter !== "all" || typeFilter !== "all";

  // Tell the AppShell bell to re-sync immediately.
  function broadcastRead() {
    try { window.dispatchEvent(new Event("advrix:notifications-updated")); } catch {}
  }

  async function handleOpen(n: Notification) {
    if (!isRead(n)) {
      setReadIds((prev) => {
        const next = new Set(prev);
        next.add(n.id);
        try { localStorage.setItem(TOASTED_KEY, JSON.stringify([...next])); } catch {}
        return next;
      });
      await markNotificationReadAction(n.id);
      broadcastRead();
    }
    if (n.link && n.link.startsWith("/") && !n.link.startsWith("//")) router.push(n.link);
  }

  async function handleMarkAll() {
    const unreadIds = items.filter((n) => !isRead(n)).map((n) => n.id);
    const nextSet = new Set([...readIds, ...unreadIds]);
    try { localStorage.setItem(TOASTED_KEY, JSON.stringify([...nextSet])); } catch {}
    setReadIds(nextSet);
    await markAllNotificationsReadAction();
    broadcastRead();
    router.refresh();
  }

  const tabs = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
  ];

  const typeTabs = [
    { key: "all", label: "All Types" },
    { key: "task", label: "Tasks" },
    { key: "project", label: "Projects" },
    { key: "leave", label: "Leaves" },
    { key: "attendance", label: "Attendance" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Updates</h1>
          <p className="text-sm text-slate-400">Activity, tasks, projects, and approvals.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
              title="Clear all filters and show every notification"
            >
              <ListFilter className="h-4 w-4" /> Clear filters &amp; show all
            </button>
          )}
          {items.length > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={unreadOnPage === 0}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${unreadOnPage === 0 ? "bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed" : "bg-brand-300 text-night-950 hover:bg-brand-200 shadow-sm"}`}
              title={unreadOnPage === 0 ? "All caught up" : `Mark ${unreadOnPage} unread on this page as read`}
            >
              <CheckCheck className="h-4 w-4" /> {unreadOnPage === 0 ? "All caught up" : `Mark all as read (${unreadOnPage})`}
            </button>
          )}
        </div>
      </div>

      {/* Stats row — counts come from a grouped query, not the loaded page */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const count = typeCounts[key]?.total ?? 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(typeFilter === key ? "all" : key)}
              className={`rounded-xl border p-2.5 flex items-center gap-2 transition-all ${
                typeFilter === key
                  ? `ring-1 ${meta.ring} border-white/20`
                  : "border-white/[0.06] hover:border-white/15"
              } bg-white/[0.03]`}
            >
              <span className={TYPE_COLORS[key]}>{meta.icon}</span>
              <div className="text-left min-w-0">
                <p className="text-[10px] text-slate-500 leading-tight truncate">{meta.label}</p>
                <p className="text-sm font-bold text-white">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Read / Unread tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === t.key
                  ? "bg-brand-300 text-night-950"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {filter === "unread" && (
          <span className="text-[11px] text-slate-500">
            Showing unread only · {total} result{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Notification list — only this page's rows are ever rendered */}
      <div className="space-y-1.5">
        {items.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-14 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
              <Inbox className="h-7 w-7 text-slate-500" />
            </div>
            <p className="font-semibold text-slate-200 text-sm">No updates</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
              {filter === "unread"
                ? "You're all caught up — nothing unread."
                : typeFilter !== "all"
                ? `No ${TYPE_META[typeFilter]?.label.toLowerCase() || typeFilter} notifications yet.`
                : "Updates will appear here as activity happens."}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="mt-3 btn-ghost !py-1.5 text-xs">
                Clear filters &amp; show all
              </button>
            )}
          </div>
        ) : (
          items.map((n) => {
            const read = isRead(n);
            const meta = TYPE_META[n.type] || TYPE_META.system;
            return (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={`w-full flex items-start gap-3.5 px-4 py-3.5 rounded-xl text-left transition-all group ${
                  read
                    ? "bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04]"
                    : "bg-brand-300/[0.06] hover:bg-brand-300/[0.10] border border-brand-300/15 shadow-sm shadow-brand-300/5"
                }`}
              >
                {/* Type icon */}
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ring-1 ${meta.ring} ${meta.bg} ${TYPE_COLORS[n.type]}`}>
                  {meta.icon}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${read ? "text-slate-300" : "text-white font-semibold"}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                      {!read && (
                        <span className="h-2 w-2 rounded-full bg-brand-300 shadow-sm shadow-brand-300/50" />
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1" title={formatIST(n.created_at)}>
                        <Clock className="h-3 w-3" />
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                  {n.body && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{n.body}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${meta.bg} ${TYPE_COLORS[n.type]}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                    {!read && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-300/15 text-brand-300">
                        New
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Server-side pager */}
      {total > 0 && (
        <div className="card overflow-hidden">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            busy={loading}
            itemLabel="notifications"
            onPage={goToPage}
            onPageSize={changePageSize}
          />
        </div>
      )}
    </div>
  );
}