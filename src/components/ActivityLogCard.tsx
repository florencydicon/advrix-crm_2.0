"use client";

import { History, MapPin } from "lucide-react";
import type { ActivityLogRow } from "@/lib/activity";

const ACTION_META: Record<string, { label: string; cls: string }> = {
  attendance_check_in: { label: "Check-in", cls: "bg-emerald-400/10 text-emerald-300" },
  attendance_check_out: { label: "Check-out", cls: "bg-sky-400/10 text-sky-300" },
  leave_requested: { label: "Leave requested", cls: "bg-amber-400/10 text-amber-300" },
  leave_approved: { label: "Leave approved", cls: "bg-emerald-400/10 text-emerald-300" },
  leave_rejected: { label: "Leave rejected", cls: "bg-rose-400/10 text-rose-300" },
};

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString([], { day: "numeric", month: "short" }) +
      " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export default function ActivityLogCard({ activity }: { activity: ActivityLogRow[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <History className="h-4 w-4 text-brand-300" />
        <h3 className="font-semibold text-sm">Activity Log — Permanent Audit Trail</h3>
        <span className="badge bg-white/5 text-slate-400 ml-auto">last {activity.length}</span>
      </div>
      {activity.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          No activity recorded yet. Punch-ins/outs and leave decisions will appear here permanently.
        </p>
      ) : (
        <div className="divide-y divide-white/[0.05] max-h-[420px] overflow-y-auto">
          {activity.map((a) => {
            const meta = ACTION_META[a.action] || { label: a.action.replace(/_/g, " "), cls: "bg-white/10 text-slate-300" };
            const lat = (a.metadata as any)?.latitude as number | undefined;
            const lng = (a.metadata as any)?.longitude as number | undefined;
            const locationText = (a.metadata as any)?.location_text as string | undefined;
            return (
              <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
                <span className={`badge shrink-0 text-[10px] mt-0.5 ${meta.cls}`}>{meta.label}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-200">
                    {a.actor_name}
                    {a.action.startsWith("attendance_") && <span className="text-slate-500"> · {fmtTime(a.created_at)}</span>}
                    {!a.action.startsWith("attendance_") && <span className="text-slate-500"> · {fmtTime(a.created_at)}</span>}
                  </p>
                  {(a.metadata as any)?.leave_type && (
                    <p className="text-[11px] text-slate-500">
                      {(a.metadata as any).leave_type} · {(a.metadata as any).start_date} → {(a.metadata as any).end_date} · {(a.metadata as any).days}d
                      {(a.metadata as any)?.rejection_reason && <span className="text-rose-400"> · {(a.metadata as any).rejection_reason}</span>}
                    </p>
                  )}
                  {(lat != null || locationText) && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-amber-400/70" />
                      {locationText || `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`}
                      {lat != null && (
                        <a
                          href={`https://maps.google.com/?q=${lat},${lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-300 hover:text-brand-200 underline underline-offset-2"
                        >
                          Map
                        </a>
                      )}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}