"use client";

import { useMemo, useState, useTransition } from "react";
import { Layers, History, Check, Undo2, RotateCcw, ArrowRight, ArrowDown } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import KanbanBoard from "@/components/KanbanBoard";
import DataTable, { type Column } from "@/components/DataTable";
import {
  completePipelineTaskAction,
  sendBackPipelineTaskAction,
  reopenPipelineTaskAction,
} from "@/lib/actions/pipeline";
import type { PipelineBoardPayload } from "@/lib/actions/pipeline";

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function stageLabel(task: Task): string {
  const step = task.current_step ?? 0;
  const seq = task.assignees || [];
  if (task.status === "completed") return "Completed";
  if (seq.length === 0) return "—";
  const idx = Math.min(step, seq.length - 1);
  return `${seq[idx]?.name || "Unassigned"}`;
}

export default function ProjectPipeline({ initial }: { initial: PipelineBoardPayload }) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [board, setBoard] = useState(initial);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        notify(res.error || "Something went wrong.");
        return;
      }
      const next = await (await import("@/lib/actions/pipeline")).getPipelineBoardAction();
      setBoard(next);
      setOpenTaskId(null);
      notify(okMsg);
    });
  };

  const onComplete = (taskId: string) =>
    run(() => completePipelineTaskAction(taskId), "Task advanced.");

  const onSendBack = (taskId: string) =>
    run(() => sendBackPipelineTaskAction(taskId), "Task sent back.");

  const onReopen = (taskId: string) =>
    run(() => reopenPipelineTaskAction(taskId), "Task reopened.");

  const activeCount = board.active.length;
  const completedCount = board.completed.length;

  const expanded = (task: Task) => {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-[9px] uppercase tracking-wide text-slate-500">Client · Project</p>
          <p className="text-[11px] text-slate-300">
            {task.client_name} / {task.project_name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <span className="text-[9px] text-slate-500">Stage · {stageLabel(task)}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={() => onSendBack(task.id)}
              className="btn-ghost !px-2 !py-1 text-[10px]"
              title="Send back a stage"
            >
              <Undo2 className="h-3 w-3" /> Send Back
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => onComplete(task.id)}
              className="btn-primary !px-2 !py-1 text-[10px]"
            >
              <Check className="h-3 w-3" /> Complete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const historyColumns: Column<Task>[] = [
    {
      key: "title",
      label: "Task",
      sortable: true,
      render: (t) => (
        <div>
          <p className="font-medium text-white leading-tight">{t.title}</p>
          <p className="text-xs text-slate-500">{t.project_name}</p>
        </div>
      ),
    },
    {
      key: "client",
      label: "Client",
      render: (t) => (
        <span className="text-slate-300">{t.client_company || t.client_name}</span>
      ),
    },
    {
      key: "assignee",
      label: "Completed By",
      render: (t) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300">
            {initials(t.assignee_name)}
          </span>
          <span className="text-xs text-slate-300">{t.assignee_name || "—"}</span>
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "completed_at",
      label: "Completed",
      sortable: true,
      render: (t) =>
        t.completed_at ? (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {new Date(t.completed_at).toLocaleDateString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        ),
    },
  ];

  if (board.canReopen) {
    historyColumns.push({
      key: "actions",
      label: "Actions",
      render: (t) => (
        <button
          type="button"
          disabled={isPending}
          onClick={() => onReopen(t.id)}
          className="btn-ghost !px-2 !py-1 text-[10px]"
          title="Re-open this task back to the Active Board"
        >
          <RotateCcw className="h-3 w-3" /> Re-open
        </button>
      ),
    });
  }

  const sortedActive = useMemo(() => {
    return [...board.active].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  }, [board.active]);

  return (
    <div className="h-full flex flex-col">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-brand-300/40 bg-night-850 px-4 py-2 text-sm text-white shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-1 mb-4 shrink-0">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
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

      {tab === "active" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 text-emerald-300" /> Complete auto-assigns the next stage
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-brand-300" /> A → B → C sequence
            </span>
            <span className="inline-flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-rose-300" /> Send Back moves a stage backward
            </span>
          </div>
          {sortedActive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Layers className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No active tasks</p>
              <p className="text-sm text-slate-500 mt-1">
                Everything is either complete or assigned elsewhere. History holds the finished work.
              </p>
            </div>
          ) : (
            <KanbanBoard
              tasks={sortedActive}
              canManage={board.canManage}
              openTaskId={openTaskId}
              onToggleOpen={(id) => setOpenTaskId((cur) => (cur === id ? null : id))}
              onMove={(id, status) =>
                run(async () => {
                  const { movePipelineTaskAction } = await import("@/lib/actions/pipeline");
                  return movePipelineTaskAction(id, status);
                }, "Task moved.")
              }
              renderExpanded={expanded}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <DataTable
            columns={historyColumns}
            data={board.completed}
            emptyTitle="No completed tasks yet"
            emptySubtitle="Tasks you complete on the Active Board land here."
            actions={
              board.canReopen ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <RotateCcw className="h-3 w-3" /> Re-open returns a task to the Active Board
                </span>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
