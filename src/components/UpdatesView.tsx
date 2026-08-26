"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCheck, Inbox, Clock, FileText, Briefcase, CalendarOff, Settings } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types";

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

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function UpdatesView({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const typeFilter = searchParams.get("type") || "all";
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const isRead = (n: Notification) => n.read || readIds.has(n.id);
  const unreadCount = notifications.filter((n) => !isRead(n)).length;

  const filtered = notifications.filter((n) => {
    if (filter === "unread" && isRead(n)) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("filter");
    else params.set("filter", value);
    router.push(`/updates?${params.toString()}`);
  }

  function setTypeFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("type");
    else params.set("type", value);
    router.push(`/updates?${params.toString()}`);
  }

  async function handleOpen(n: Notification) {
    if (!isRead(n)) {
      setReadIds((prev) => new Set(prev).add(n.id));
      await markNotificationReadAction(n.id);
    }
    if (n.link && n.link.startsWith("/") && !n.link.startsWith("//")) router.push(n.link);
  }

  async function handleMarkAll() {
    setReadIds(new Set(notifications.filter((n) => !n.read).map((n) => n.id)));
    await markAllNotificationsReadAction();
    router.refresh();
  }

  const tabs = [
    { key: "all", label: "All", count: notifications.length },
    { key: "unread", label: "Unread", count: unreadCount },
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
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="btn-secondary !py-2 text-xs">
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Object.entries(TYPE_META).map(([key, meta]) => {
          const count = notifications.filter((n) => n.type === key).length;
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
            {t.count > 0 && (
              <span className={`ml-1.5 text-[10px] ${filter === t.key ? "opacity-70" : "opacity-60"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-1.5">
        {filtered.length === 0 ? (
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
          </div>
        ) : (
          filtered.map((n, i) => {
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
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
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
    </div>
  );
}
