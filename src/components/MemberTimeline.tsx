"use client";

import { useEffect, useState } from "react";
import { History, Loader2, Briefcase, CheckCircle2, Clock } from "lucide-react";
import { getMemberTimelineAction, type MemberTimelinePayload } from "@/lib/actions/team";
import { Modal, StatusBadge } from "@/components/ui";
import ActivityLogCard from "@/components/ActivityLogCard";
import type { UserRow, Task } from "@/lib/types";
import { formatClientName } from "@/lib/utils";

function fmt(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return (
      d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return "—";
  }
}

function TimelineRow({ task, memberId }: { task: Task; memberId: string }) {
  const mine = (task.contributions || []).filter((c) => c.user_id === memberId);
  return (
    <div className="rounded-lg border border-white/10 bg-night-850 p-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white leading-tight">{task.title}</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {formatClientName(task.client_company, task.client_name)} · {task.project_name}
          </p>
        </div>
        {task.role_label && <span className="badge bg-white/10 text-slate-300 text-[10px]">{task.role_label}</span>}
        <StatusBadge status={task.status} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Created {fmt(task.created_at)}</span>
        {task.brief_approved_at && <span className="text-emerald-300">Approved {fmt(task.brief_approved_at)}</span>}
        {task.completed_at && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3 w-3" />Completed {fmt(task.completed_at)}</span>}
      </div>
      {mine.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {mine.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 bg-white/[0.03] rounded px-1.5 py-1">
              <span className="text-slate-500">Step {c.step + 1}</span>
              <span
                className={`badge !px-1.5 !py-0 text-[9px] ${
                  c.status === "approved"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : c.status === "needs_improvement"
                      ? "bg-rose-400/10 text-rose-300"
                      : "bg-violet-400/10 text-violet-300"
                }`}
              >
                {c.status === "approved" ? "Approved" : c.status === "needs_improvement" ? "Needs improvement" : "Awaiting review"}
              </span>
              <span>Submitted {fmt(c.submitted_at)}</span>
              {c.reviewed_at && <span>· Reviewed {fmt(c.reviewed_at)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MemberTimeline({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [data, setData] = useState<MemberTimelinePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getMemberTimelineAction(user.id).then((res) => {
      if (!alive) return;
      if ("error" in res) setError(res.error);
      else setData(res.payload);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [user.id]);

  return (
    <Modal open onClose={onClose} title={`Timeline — ${user.full_name}`}>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
        </div>
      ) : error ? (
        <p className="py-8 text-center text-xs text-rose-300">{error}</p>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {data && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-400">
              <p>
                {data.member.designation || data.member.role_label || "Member"} ·{" "}
                {data.tasks.length} task{data.tasks.length === 1 ? "" : "s"} ·{" "}
                Joined {fmt(data.member.created_at)}
              </p>
            </div>
          )}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
              <Briefcase className="h-3.5 w-3.5 text-brand-300" /> Task history
            </p>
            {!data || data.tasks.length === 0 ? (
              <p className="text-xs text-slate-500">No tasks recorded for this member yet.</p>
            ) : (
              <div className="space-y-1.5">
                {data.tasks.map((t) => (
                  <TimelineRow key={t.id} task={t} memberId={user.id} />
                ))}
              </div>
            )}
          </div>
          {data && data.activity.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 uppercase tracking-wide mb-1.5">
                <History className="h-3.5 w-3.5 text-brand-300" /> Recent actions
              </p>
              <ActivityLogCard activity={data.activity} />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}