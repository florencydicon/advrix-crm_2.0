"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types";

const NOTIF_STYLES: Record<string, string> = {
  task: "bg-brand-100 text-brand-700",
  project: "bg-violet-100 text-violet-700",
  leave: "bg-amber-100 text-amber-700",
  attendance: "bg-emerald-100 text-emerald-700",
  system: "bg-slate-100 text-slate-600",
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
    if (n.link) router.push(n.link);
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
          <p className="text-sm text-slate-500">Activity, tasks, projects, and approvals.</p>
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
              filter === t.key ? "bg-ink text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-slate-400" />
            </div>
            <p className="font-medium text-slate-700">No updates</p>
            <p className="text-sm text-slate-400 mt-1">
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
                className={`w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors ${isRead ? "" : "bg-brand-50/50"}`}
              >
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${NOTIF_STYLES[n.type] || "bg-slate-100 text-slate-600"}`}>
                  {n.type.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm ${isRead ? "text-slate-700" : "text-slate-900 font-semibold"}`}>{n.title}</p>
                    <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="badge bg-slate-100 text-slate-500 text-[10px]">{TYPE_LABELS[n.type] || n.type}</span>
                    {!isRead && <span className="badge bg-brand-100 text-brand-700 text-[10px]">New</span>}
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