"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types";

const NOTIF_STYLES: Record<string, string> = {
  task: "bg-brand-300/10 text-brand-300",
  project: "bg-violet-400/10 text-violet-300",
  leave: "bg-amber-400/10 text-amber-300",
  attendance: "bg-emerald-400/10 text-emerald-300",
  system: "bg-white/10 text-slate-300",
};

const TYPE_LABELS: Record<string, string> = {
  task: "Task",
  project: "Project",
  leave: "Leave",
  attendance: "Attendance",
  system: "System",
};

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function UpdatesView({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read && !readIds.has(n.id);
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read && !readIds.has(n.id)).length;

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("filter");
    else params.set("filter", value);
    router.push(`/updates?${params.toString()}`);
  }

  async function handleOpen(n: Notification) {
    if (!n.read && !readIds.has(n.id)) {
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
    { key: "all", label: "All" },
    { key: "unread", label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Updates</h1>
          <p className="text-sm text-slate-400">Activity, tasks, projects, and approvals.</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="btn-secondary !py-2 text-xs">
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === t.key ? "bg-brand-300 text-night-950" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-white/[0.06]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-slate-500" />
            </div>
            <p className="font-medium text-slate-200">No updates</p>
            <p className="text-sm text-slate-500 mt-1">
              {filter === "unread" ? "You're all caught up." : "Nothing to show here yet."}
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const isRead = n.read || readIds.has(n.id);
            return (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={`w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-white/[0.04] transition-colors ${isRead ? "" : "bg-brand-300/[0.07]"}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${NOTIF_STYLES[n.type] || "bg-white/10 text-slate-300"}`}>
                  {n.type.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${isRead ? "text-slate-200" : "text-white font-semibold"}`}>{n.title}</p>
                    <span className="text-[11px] text-slate-500 shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-sm text-slate-400 mt-0.5">{n.body}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="badge bg-white/10 text-slate-400 text-[10px]">{TYPE_LABELS[n.type] || n.type}</span>
                    {!isRead && <span className="badge bg-brand-300/10 text-brand-300 text-[10px]">New</span>}
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