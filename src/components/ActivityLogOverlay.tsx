"use client";

import { useEffect } from "react";
import { X, History, MapPin, Coffee, Clock, CheckCircle2, XCircle, Calendar, LogIn, LogOut } from "lucide-react";
import type { ActivityLogRow } from "@/lib/activity";

const ACTION_META: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  attendance_check_in: { label: "Check-in", cls: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20", icon: LogIn },
  attendance_check_out: { label: "Check-out", cls: "bg-sky-400/10 text-sky-300 border border-sky-400/20", icon: LogOut },
  lunch_break_start: { label: "Lunch break", cls: "bg-orange-500/15 text-orange-300 border border-orange-500/30", icon: Coffee },
  lunch_break_end: { label: "Break ended", cls: "bg-orange-500/15 text-orange-300 border border-orange-500/30", icon: Coffee },
  leave_requested: { label: "Leave requested", cls: "bg-violet-500/15 text-violet-300 border border-violet-500/30", icon: Calendar },
  leave_approved: { label: "Leave approved", cls: "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20", icon: CheckCircle2 },
  leave_rejected: { label: "Leave rejected", cls: "bg-rose-400/10 text-rose-300 border border-rose-400/20", icon: XCircle },
  // fallback for older/other actions
  task_created: { label: "Task", cls: "bg-white/10 text-slate-300", icon: Clock },
};

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function ActivityList({ activity }: { activity: ActivityLogRow[] }) {
  if (activity.length === 0) {
    return (
      <p className="px-4 py-10 text-sm text-slate-500 text-center">
        No activity recorded yet. Punch-ins/outs and leave decisions will appear here permanently.
      </p>
    );
  }
  return (
    <div className="divide-y divide-white/[0.05]">
      {activity.map((a) => {
        const raw = ACTION_META[a.action] || { label: a.action.replace(/_/g, " "), cls: "bg-white/10 text-slate-300 border border-white/10", icon: History };
        const meta = raw as { label: string; cls: string; icon: React.ComponentType<{ className?: string }> };
        const Icon = meta.icon;
        const lat = (a.metadata as any)?.latitude as number | undefined;
        const lng = (a.metadata as any)?.longitude as number | undefined;
        const locationText = (a.metadata as any)?.location_text as string | undefined;
        const isLunchBreak = a.action === "lunch_break_start" || a.action === "lunch_break_end";
        const isLeave = a.action.startsWith("leave_");
        return (
          <div key={a.id} className="px-4 py-3 flex items-start gap-3">
            <span className={`badge shrink-0 text-[10px] mt-0.5 inline-flex items-center gap-1 ${meta.cls}`}>
              <Icon className="h-3 w-3" />
              {meta.label}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-200">
                {a.actor_name}
                <span className="text-slate-500"> · {fmtTime(a.created_at)}</span>
              </p>
              {isLunchBreak && (
                <p className="text-[11px] text-orange-300/80 mt-0.5">
                  {a.action === "lunch_break_start" ? "Started lunch break" : `Ended lunch break`}
                  {(a.metadata as any)?.total_break_mins != null && <span className="text-slate-500"> · {(a.metadata as any).total_break_mins}m total</span>}
                  {(a.metadata as any)?.mins != null && <span className="text-slate-500"> · {(a.metadata as any).mins}m</span>}
                </p>
              )}
              {isLeave && (
                <p className="text-[11px] text-violet-300/90 mt-0.5">
                  {(a.metadata as any).leave_type && <span>{(a.metadata as any).leave_type} · {(a.metadata as any).start_date} → {(a.metadata as any).end_date} · {(a.metadata as any).days}d</span>}
                  {(a.metadata as any)?.rejection_reason && <span className="text-rose-400"> · {(a.metadata as any).rejection_reason}</span>}
                </p>
              )}
              {!isLunchBreak && !isLeave && (a.metadata as any)?.leave_type && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(a.metadata as any).leave_type} · {(a.metadata as any).start_date} → {(a.metadata as any).end_date} · {(a.metadata as any).days}d
                  {(a.metadata as any)?.rejection_reason && <span className="text-rose-400"> · {(a.metadata as any).rejection_reason}</span>}
                </p>
              )}
              {(lat != null || locationText) && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-amber-400/70 shrink-0" />
                  <span className="truncate">{locationText || `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`}</span>
                  {lat != null && (
                    <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="text-brand-300 hover:text-brand-200 underline underline-offset-2 shrink-0">
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
  );
}

export default function ActivityLogOverlay({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: ActivityLogRow[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />

      {/* Desktop Drawer (md+): slide-over from right, 30-40% width */}
      <div className="hidden md:flex fixed inset-y-0 right-0 z-[60] w-[380px] lg:w-[420px] max-w-[40vw] bg-night-950 border-l border-white/10 shadow-2xl shadow-black/50 flex-col overflow-hidden animate-fade-in">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <History className="h-4 w-4 text-brand-300 shrink-0" />
            <h3 className="font-semibold text-sm text-white truncate">Activity Log — Permanent Audit Trail</h3>
            <span className="badge bg-white/5 text-slate-400 ml-2 shrink-0">last {activity.length}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors shrink-0" aria-label="Close activity log">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ActivityList activity={activity} />
        </div>
      </div>

      {/* Mobile Popup ( < md ): full-screen padded modal */}
      <div className="md:hidden fixed inset-0 z-[60] flex flex-col p-4 pb-24 overflow-hidden">
        <div className="relative flex flex-col flex-1 bg-night-950 rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden max-h-full">
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <History className="h-4 w-4 text-brand-300 shrink-0" />
              <h3 className="font-semibold text-sm text-white">Activity Log</h3>
              <span className="badge bg-white/5 text-slate-400 shrink-0">{activity.length}</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ActivityList activity={activity} />
          </div>
        </div>
        {/* Mobile Floating Close FAB — exact required classes */}
        <button
          onClick={onClose}
          aria-label="Close activity log"
          className="fixed bottom-24 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl border border-gray-600 active:scale-95 transition-transform md:hidden"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </>
  );
}
