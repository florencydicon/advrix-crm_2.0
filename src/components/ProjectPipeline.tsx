"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Layers,
  History,
  Check,
  Undo2,
  RotateCcw,
  ChevronRight,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import {
  getPipelineBoardAction,
  reopenPipelineTaskAction,
} from "@/lib/actions/pipeline";
import type { PipelineBoardPayload } from "@/lib/actions/pipeline";
import TaskModal from "@/components/TaskModal";

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return mobile;
}

export default function ProjectPipeline({
  initial,
  team,
}: {
  initial: PipelineBoardPayload;
  team: UserRow[];
}) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [board, setBoard] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  // Ultra-lean modal (active task)
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Audit log modal (completed task in History)
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  const isMobile = useIsMobile();

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const reload = useCallback(async () => {
    const next = await getPipelineBoardAction();
    setBoard(next);
  }, []);

  const activeCount = board.active.length;
  const completedCount = board.completed.length;

  const sortedActive = useMemo(
    () => [...board.active].sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
    [board.active]
  );

  const stageLabel = (task: Task) => {
    if (task.status === "completed") return "Completed";
    const step = task.current_step ?? 0;
    const seq = task.assignees || [];
    if (seq.length === 0) return "Unassigned";
    const idx = Math.min(step, seq.length - 1);
    return seq[idx]?.name || "Unassigned";
  };

  // ---- Desktop tables ----
  const activeTable = (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Project</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Deadline</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {sortedActive.map((t) => (
              <tr
                key={t.id}
                onClick={() => setActiveTask(t)}
                className="hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3 text-xs text-slate-300">{t.client_company || t.client_name}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{t.project_name}</td>
                <td className="px-4 py-3">
                  <div className="max-w-[280px] truncate text-sm font-medium text-white">{t.title}</div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(t.due_date)}</td>
                <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">{stageLabel(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const historyTable = (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Task</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date &amp; Time</th>
              {board.canReopen && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Re-open</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {board.completed.map((t) => (
              <tr
                key={t.id}
                onClick={() => setHistoryTask(t)}
                className="hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <div className="max-w-[280px] truncate text-sm font-medium text-white">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.project_name}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-300">{t.client_company || t.client_name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">
                      {initials(t.assignee_name)}
                    </span>
                    <span className="text-xs text-slate-300">{t.assignee_name || "—"}</span>
                  </span>
                </td>
                <td className="px-4 py-3"><StatusBadge status="completed" /></td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDateTime(t.completed_at)}</td>
                {board.canReopen && (
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(async () => {
                          const res = await reopenPipelineTaskAction(t.id);
                          if (!res.ok) return notify(res.error || "Could not reopen.");
                          await reload();
                          notify("Task reopened.");
                          setHistoryTask(null);
                        });
                      }}
                      className="btn-ghost !px-2.5 !py-1.5 text-xs"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Re-open
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---- Mobile stacked cards ----
  const mobileCard = (t: Task, isHistory: boolean) => (
    <button
      type="button"
      key={t.id}
      onClick={() => (isHistory ? setHistoryTask(t) : setActiveTask(t))}
      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{t.client_company || t.client_name} · {t.project_name}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <StatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
        <span className="inline-flex items-center gap-1 text-xs text-slate-400 ml-auto">
          <CalendarDays className="h-3.5 w-3.5" />{fmtDate(t.due_date)}
        </span>
      </div>
      {isHistory ? (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06] text-xs">
          <span className="text-slate-400">By <span className="text-slate-200">{t.assignee_name || "—"}</span></span>
          <span className="text-slate-500">{fmtDateTime(t.completed_at)}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06] text-xs">
          <span className="text-slate-400">Stage · <span className="text-brand-300">{stageLabel(t)}</span></span>
        </div>
      )}
    </button>
  );

  const activeMobile = (
    <div className="space-y-2.5">
      {sortedActive.map((t) => mobileCard(t, false))}
    </div>
  );

  const historyMobile = (
    <div className="space-y-2.5">
      {board.completed.map((t) => mobileCard(t, true))}
    </div>
  );

  // ---- History Audit Log Modal ----
  const historyModal = historyTask ? (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setHistoryTask(null)} />
      <div
        className={`relative w-full bg-night-850 border-white/10 shadow-2xl flex flex-col ${
          isMobile
            ? "bottom-sheet h-[100dvh] max-h-[100dvh] border-t md:hidden rounded-t-2xl"
            : "modal-pop rounded-2xl border max-w-md md:max-h-[85vh]"
        }`}
      >
        <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHistoryTask(null)}
            className="flex items-center gap-1.5 btn-ghost !px-2.5 !py-2 text-sm shrink-0"
            aria-label="Close"
          >
            <RotateCcw className="h-5 w-5 rotate-90" />
            <span className="md:hidden font-medium">Back</span>
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 mb-0.5">Audit Log</div>
            <div className="text-base font-bold text-white leading-snug truncate">{historyTask.title}</div>
          </div>
          <StatusBadge status="completed" />
        </div>

        <div className="p-4 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-300" /> Completion Audit
            </p>
            <dl className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-sm text-slate-400">Who completed</dt>
                <dd className="flex items-center gap-2 text-sm font-medium text-white">
                  <span className="h-6 w-6 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">
                    {initials(historyTask.assignee_name)}
                  </span>
                  {historyTask.assignee_name || "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-sm text-slate-400">Action taken</dt>
                <dd className="inline-flex items-center gap-1.5 text-sm text-emerald-300">
                  <Check className="h-4 w-4" /> Marked complete
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-sm text-slate-400">Date &amp; Time</dt>
                <dd className="text-sm text-slate-200">{fmtDateTime(historyTask.completed_at)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-sm text-slate-400">Client / Project</dt>
                <dd className="text-sm text-slate-200 text-right">
                  {historyTask.client_company || historyTask.client_name}
                  <div className="text-xs text-slate-500">{historyTask.project_name}</div>
                </dd>
              </div>
            </dl>
            {historyTask.remarks?.trim() && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Remarks</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{historyTask.remarks}</p>
              </div>
            )}
          </div>

          {board.canReopen && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await reopenPipelineTaskAction(historyTask.id);
                  if (!res.ok) return notify(res.error || "Could not reopen.");
                  await reload();
                  notify("Task reopened.");
                  setHistoryTask(null);
                })
              }
              className="btn-ghost w-full !py-2.5 text-sm"
            >
              <RotateCcw className="h-4 w-4" /> Re-open to Active Board
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="h-full flex flex-col">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] rounded-lg border border-brand-300/40 bg-night-850 px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 shrink-0">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "active"
              ? "bg-brand-300 text-night-950"
              : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
          }`}
        >
          <Layers className="h-4 w-4" />
          Active Board
          <span className={`text-xs font-semibold ${tab === "active" ? "text-night-900" : "text-slate-500"}`}>
            {activeCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "history"
              ? "bg-brand-300 text-night-950"
              : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
          }`}
        >
          <History className="h-4 w-4" />
          History
          <span className={`text-xs font-semibold ${tab === "history" ? "text-night-900" : "text-slate-500"}`}>
            {completedCount}
          </span>
        </button>
      </div>

      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 shrink-0">
        <span className="inline-flex items-center gap-1"><ArrowRight className="h-3 w-3 text-brand-300" /> A → B → C sequence</span>
        <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-300" /> Complete auto-assigns next stage</span>
        <span className="inline-flex items-center gap-1"><Undo2 className="h-3 w-3 text-rose-300" /> Send Back moves a stage backward</span>
      </div>

      {tab === "active" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {sortedActive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Layers className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No active tasks</p>
              <p className="text-sm text-slate-500 mt-1">Everything is complete or assigned elsewhere.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">{activeTable}</div>
              <div className="md:hidden">{activeMobile}</div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {board.completed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <History className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No completed tasks yet</p>
              <p className="text-sm text-slate-500 mt-1">Tasks you complete on the Active Board land here.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">{historyTable}</div>
              <div className="md:hidden">{historyMobile}</div>
            </>
          )}
        </div>
      )}

      {activeTask && (
        <TaskModal
          key={activeTask.id}
          task={activeTask}
          team={team}
          isMobile={isMobile}
          canManageTeam={board.canManage}
          onClose={() => setActiveTask(null)}
          refresh={reload}
        />
      )}
      {historyModal}
    </div>
  );
}
