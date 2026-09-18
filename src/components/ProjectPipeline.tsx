"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  History,
  Check,
  Undo2,
  RotateCcw,
  ChevronRight,
  CalendarDays,
  ArrowRight,
  Search,
  X,
  AlertTriangle,
  FolderKanban,
} from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { TASK_STATUS_FLOW } from "@/lib/types";
import { StatusBadge, PriorityBadge, STATUS_ORDER, STATUS_META, PRIORITY_META, DeadlineBadge } from "@/components/ui";
import { useAdvancedFilters, AdvancedFilterBar, taskStageValues } from "@/components/AdvancedFilterBar";
import { isOverdue } from "@/lib/deadlines";
import {
  getPipelineBoardAction,
  reopenPipelineTaskAction,
  bulkAssignPipelineTeamAction,
  bulkDeletePipelineTasksAction,
  bulkSetPipelineStatusAction,
  bulkSetPipelineStageAction,
  bulkSetPipelineDeadlineAction,
  bulkMoveBackPipelineTasksAction,
  bulkMoveBackToStageAction,
  moveBackPipelineTaskAction,
  startPipelineTaskAction,
} from "@/lib/actions/pipeline";
import type { PipelineBoardPayload } from "@/lib/actions/pipeline";
import dynamic from "next/dynamic";
// Lazy: both editing modals are only needed once a user opens them.
const TaskModal = dynamic(() => import("@/components/TaskModal"), { ssr: false });
const TaskModalFull = dynamic(() => import("@/components/TaskModalFull"), { ssr: false });
import BulkActionBar, { type StageOption } from "@/components/BulkActionBar";

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

const clientName = (t: Task) => t.client_company || t.client_name || "";

function stageLabel(task: Task) {
  if (task.status === "completed") return "Completed";
  const step = task.current_step ?? 0;
  const seq = task.assignees || [];
  if (seq.length === 0) return "Unassigned";
  const idx = Math.min(step, seq.length - 1);
  return seq[idx]?.name || "Unassigned";
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

/** "QC Review" pill shown on rows/cards whose task is awaiting gatekeeper approval. */
function QcPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-300/50 bg-violet-400/10 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
      <Check className="h-3 w-3" /> QC Review
    </span>
  );
}
function ClientFeedbackPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
      <AlertTriangle className="h-3 w-3" /> Client Feedback
    </span>
  );
}

// --- Memoized row components ------------------------------------------------
// Rows re-render on every board-poll; memoizing lets a checkbox toggle / filter
// keystroke re-render only the touched row instead of the whole table. Callbacks
// are kept stable via useCallback; `isSelected` is a per-row boolean so a
// selection change re-renders just the two rows it affects.

const PipelineActiveRow = memo(function PipelineActiveRow({
  t,
  isManager,
  isSelected,
  onOpen,
  onToggleSelect,
  onStart,
  currentUserId,
}: {
  t: Task;
  isManager: boolean;
  isSelected: boolean;
  onOpen: (t: Task) => void;
  onToggleSelect: (id: string) => void;
  onStart: (id: string) => void;
  currentUserId: string | null;
}) {
  const overdue = isOverdue(t);
  const sub = t.status === "submitted";
  return (
    <tr
      onClick={() => onOpen(t)}
      className={`transition-colors cursor-pointer ${
        overdue
          ? "bg-rose-500/[0.07] hover:bg-rose-500/[0.13]"
          : sub
            ? "bg-violet-400/[0.07] hover:bg-violet-400/[0.12]"
            : "hover:bg-white/[0.04]"
      }`}
    >
      {isManager && (
        <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={`Select ${t.title}`}
            checked={isSelected}
            onChange={() => onToggleSelect(t.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 accent-emerald-400 cursor-pointer"
          />
        </td>
      )}
      <td className="px-4 py-3 text-xs text-slate-300">{t.client_company || t.client_name}</td>
      <td className="px-4 py-3 text-xs text-slate-300">{t.project_name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="max-w-[260px] truncate text-sm font-medium text-white">{t.title}</div>
          {t.status === "submitted" && <QcPill />}
          {t.status === "client_feedback" && <ClientFeedbackPill />}
          {t.status === "approved" && t.assigned_to === currentUserId && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStart(t.id); }}
              className="inline-flex items-center gap-1 rounded-full bg-brand-300 text-night-950 px-2 py-0.5 text-[10px] font-bold hover:bg-brand-200 transition-colors shrink-0"
              title="Start Task - only assignee"
            >
              <Layers className="h-3 w-3" /> Start
            </button>
          )}
          {overdue && (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" aria-label="Overdue" />
          )}
        </div>
      </td>
      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
      <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
      <td className={`px-4 py-3 text-xs whitespace-nowrap ${overdue ? "text-rose-300 font-semibold" : "text-slate-400"}`}>
        {overdue && <AlertTriangle className="h-3.5 w-3.5 inline-block mr-1 -mt-0.5 text-rose-400" />}
        {fmtDate(t.due_date)}
      </td>
      <td className="px-4 py-3 text-right text-xs text-slate-400 whitespace-nowrap">{stageLabel(t)}</td>
    </tr>
  );
});

const PipelineHistoryRow = memo(function PipelineHistoryRow({
  t,
  canReopen,
  canMoveBack,
  isPending,
  onOpen,
  onReopen,
  onMoveBack,
}: {
  t: Task;
  canReopen: boolean;
  canMoveBack: boolean;
  isPending: boolean;
  onOpen: (t: Task) => void;
  onReopen: (id: string) => void;
  onMoveBack: (id: string) => void;
}) {
  return (
    <tr
      onClick={() => onOpen(t)}
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
      {canReopen && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              onReopen(t.id);
            }}
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Re-open
          </button>
        </td>
      )}
      {canMoveBack && (
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              e.stopPropagation();
              onMoveBack(t.id);
            }}
            className="btn-ghost !px-2.5 !py-1.5 text-xs"
          >
            <Undo2 className="h-3.5 w-3.5" /> Move Back
          </button>
        </td>
      )}
    </tr>
  );
});

const PipelineActiveMobileCard = memo(function PipelineActiveMobileCard({
  t,
  isManager,
  isSelected,
  onOpen,
  onToggleSelect,
  onStart,
  currentUserId,
}: {
  t: Task;
  isManager: boolean;
  isSelected: boolean;
  onOpen: (t: Task) => void;
  onToggleSelect: (id: string) => void;
  onStart: (id: string) => void;
  currentUserId: string | null;
}) {
  const overdue = isOverdue(t);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(t);
        }
      }}
      className={`w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
        overdue
          ? "border-rose-500/40 bg-rose-500/[0.08]"
          : t.status === "submitted"
            ? "border-violet-300/40 bg-violet-400/[0.08]"
            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{t.client_company || t.client_name} · {t.project_name}</p>
        </div>
        {isManager && (
          <input
            type="checkbox"
            aria-label={`Select ${t.title}`}
            checked={isSelected}
            onChange={() => onToggleSelect(t.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 mt-1 accent-emerald-400 cursor-pointer shrink-0"
          />
        )}
        <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {t.status === "submitted" && <QcPill />}
        {t.status === "client_feedback" && <ClientFeedbackPill />}
        {t.status === "approved" && t.assigned_to === currentUserId && (
          <button type="button" onClick={(e)=>{e.stopPropagation(); onStart(t.id);}} className="inline-flex items-center gap-1 rounded-full bg-brand-300 text-night-950 px-2 py-0.5 text-[10px] font-bold hover:bg-brand-200"><Layers className="h-3 w-3" /> Start</button>
        )}
        <StatusBadge status={t.status} />
        <DeadlineBadge task={t} />
        <PriorityBadge priority={t.priority} />
        <span className={`inline-flex items-center gap-1 text-xs ml-auto ${overdue ? "text-rose-300 font-semibold" : "text-slate-400"}`}>
          {overdue ? (
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <CalendarDays className="h-3.5 w-3.5" />
          )}
          {fmtDate(t.due_date)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06] text-xs">
        <span className="text-slate-400">Stage · <span className="text-brand-300">{stageLabel(t)}</span></span>
      </div>
    </div>
  );
});

const PipelineHistoryMobileCard = memo(function PipelineHistoryMobileCard({
  t,
  onOpen,
}: {
  t: Task;
  onOpen: (t: Task) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(t)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(t);
        }
      }}
      className="w-full text-left rounded-xl border p-3.5 transition-colors cursor-pointer border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
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
        <DeadlineBadge task={t} />
        <PriorityBadge priority={t.priority} />
      </div>
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.06] text-xs">
        <span className="text-slate-400">By <span className="text-slate-200">{t.assignee_name || "—"}</span></span>
        <span className="text-slate-500">{fmtDateTime(t.completed_at)}</span>
      </div>
    </div>
  );
});

export default function ProjectPipeline({
  initial,
  team,
}: {
  initial: PipelineBoardPayload;
  team: UserRow[];
}) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [board, setBoard] = useState(initial);
  // Equal-data short-circuit: the 20s background poll rebuilds the whole board
  // object; if the payload is unchanged (JSON-equal) we skip setBoard so the
  // table/cards/kanban are not re-rendered at all. Client-side ETag equivalent.
  const boardDataRef = useRef<string>("");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Active board layout: grouped by project (default) or flat list.
  // Default view is always "projects" for both mobile and web; persisted in localStorage.
  const [view, setView] = useState<"projects" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("advrix.pipeline.view");
      if (saved === "projects" || saved === "list") return saved;
    }
    return "projects";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem("advrix.pipeline.view", view);
    } catch {}
  }, [view]);
  // Force default to projects on first mount if no saved preference
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("advrix.pipeline.view") : null;
    if (!saved) setView("projects");
  }, []);
  // Project whose subtasks are open in the modal.
  const [openProject, setOpenProject] = useState<{ projectId: string; projectName: string } | null>(null);
  // Selected task inside the Projects unified modal (navigation within single modal)
  const [projectTask, setProjectTask] = useState<Task | null>(null);

  // Ultra-lean modal (active task) — used only for List tab (old full modal)
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Audit log modal (completed task in History)
  const [historyTask, setHistoryTask] = useState<Task | null>(null);

  // Filters: global search + per-column dropdowns (client-side, instant).
  // The shared hook owns the select/search state, mirrors selects to the URL
  // (incl. ?clientId= deep links from the workload widget) and exposes `matches`.
  const allTaskRows = useMemo(() => [...board.active, ...board.completed], [board]);
  const af = useAdvancedFilters(allTaskRows, {
    client: {
      id: (t) => t.client_id,
      label: (t) => clientName(t).trim(),
    },
    project: { value: (t) => t.project_name },
    stage: { values: taskStageValues },
    deadline: {
      date: (t) => t.due_date,
      completed: (t) => t.status === "completed",
    },
    status: { value: (t) => t.status, order: STATUS_ORDER },
    priority: { value: (t) => t.priority },
    searchText: (t) =>
      [
        clientName(t),
        t.project_name || "",
        t.title || "",
        taskStageValues(t).join(" "),
        t.status || "",
        STATUS_META[t.status]?.label || "",
        t.priority || "",
        PRIORITY_META[t.priority]?.label || "",
        t.due_date ? fmtDate(t.due_date) : "",
        (t.due_date || "").slice(0, 10),
      ].join(" "),
  });

  // Multi-select bulk actions (active board only).
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelectId = useCallback(
    (id: string) =>
      setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])),
    []
  );

  const isMobile = useIsMobile();
  const searchParams = useSearchParams();

  // Deep-link routing: ?taskId=xxx auto-opens that task's modal (from notifications).
  const openedLinkId = useRef<string | null>(null);
  useEffect(() => {
    const id = searchParams.get("taskId");
    if (!id || openedLinkId.current === id) return;
    const found = [...board.active, ...board.completed].find((t) => t.id === id);
    if (!found) return;
    openedLinkId.current = id;
    if (found.status === "completed") {
      setTab("history");
      setHistoryTask(found);
    } else {
      setActiveTask(found);
    }
  }, [searchParams, board]);

  const reload = useCallback(async () => {
    const next = await getPipelineBoardAction();
    // Equal-data short-circuit: skip the state update (and the whole re-render)
    // when the 20s poll returns an identical payload.
    const key = JSON.stringify(next);
    if (key === boardDataRef.current) return;
    boardDataRef.current = key;
    setBoard(next);
    // Prune bulk selection to rows that still exist.
    setSelected((prev) => prev.filter((id) => next.active.some((t) => t.id === id)));
  }, []);

  // Stable row callbacks so memoized rows skip re-rendering when only the array
  // identity changes (selection/filter interactions).
  const openActive = useCallback((t: Task) => setActiveTask(t), []);
  const openHistory = useCallback((t: Task) => setHistoryTask(t), []);
  const reopenTask = useCallback(
    (id: string) => {
      startTransition(async () => {
        const res = await reopenPipelineTaskAction(id);
        if (!res.ok) return notify(res.error || "Could not reopen.");
        await reload();
        notify("Task reopened.");
        setHistoryTask(null);
      });
    },
    [reload, notify, startTransition]
  );
  const moveBackTask = useCallback(
    (id: string) => {
      startTransition(async () => {
        const res = await moveBackPipelineTaskAction(id);
        if (!res.ok) return notify(res.error || "Could not move back.");
        await reload();
        notify("Moved back one stage.");
        setHistoryTask(null);
      });
    },
    [reload, notify, startTransition]
  );

  // Reset inner task when switching projects — keeps single-modal navigation clean
  useEffect(() => {
    setProjectTask(null);
  }, [openProject?.projectId]);

  // Silent 12s background sync of the board arrays (+ instant refetch on tab
  // refocus/visibility). Fetches via the same Server Action the manual reload
  // uses; only the derived table/card data changes, so the open TaskModal
  // (draft remarks/content) is never remounted or cleared.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      reload().catch(() => {});
    }, 20000);
    const onVisible = () => {
      if (!document.hidden) reload().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [reload]);

  // Managers (role key or tasks:manage) get bulk assign/delete/status.
  const isManager =
    board.canManage ||
    ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "PM"].includes(
      (board.roleKey || "").toUpperCase()
    );
  // Stage bulk change — only PM and Super Admin (as requested)
  const canBulkStage = ["SUPER_ADMIN", "PROJECT_MANAGER", "PM"].includes(
    (board.roleKey || "").toUpperCase()
  );

  const bulkAssign = async (memberIds: string[]) => {
    const res = await bulkAssignPipelineTeamAction(selected, memberIds);
    if (!res.ok) {
      notify(res.error || "Bulk assign failed.");
      return;
    }
    notify(`Team updated on ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await reload();
  };

  const bulkDelete = async () => {
    const res = await bulkDeletePipelineTasksAction(selected);
    if (!res.ok) {
      notify(res.error || "Bulk delete failed.");
      return;
    }
    notify(`Deleted ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await reload();
  };

  // bulkStatus removed - status is now dynamic/flow-based only (7th image requirement)
  const bulkStage = async (memberId: string) => {
    const res = await bulkSetPipelineStageAction(selected, memberId);
    if (!res.ok) {
      notify(res.error || "Bulk stage change failed.");
      return;
    }
    notify(`Moved ${res.count} task${res.count === 1 ? "" : "s"} to new stage.`);
    setSelected([]);
    await reload();
  };

  const bulkDeadline = async (date: string | null) => {
    const res = await bulkSetPipelineDeadlineAction(selected, date);
    if (!res.ok) {
      notify(res.error || "Bulk deadline failed.");
      return;
    }
    notify(date ? `Deadline set for ${res.count} task${res.count === 1 ? "" : "s"}.` : `Deadline cleared for ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await reload();
  };

  const bulkTitles = async (lines: string[]) => {
    const { bulkSetPipelineTitlesAction } = await import("@/lib/actions/pipeline");
    const res = await bulkSetPipelineTitlesAction(selected, lines);
    if (!res.ok) { notify(res.error || "Bulk title failed."); return; }
    notify(`Updated ${res.count} title${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await reload();
  };
  const bulkContents = async (lines: string[]) => {
    const { bulkSetPipelineContentsAction } = await import("@/lib/actions/pipeline");
    const res = await bulkSetPipelineContentsAction(selected, lines);
    if (!res.ok) { notify(res.error || "Bulk content failed."); return; }
    notify(`Updated ${res.count} content${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await reload();
  };
  const bulkLinks = async (lines: string[]) => {
    const { bulkSetPipelineReferenceLinksAction } = await import("@/lib/actions/pipeline");
    const res = await bulkSetPipelineReferenceLinksAction(selected, lines);
    if (!res.ok) { notify(res.error || "Bulk links failed."); return; }
    notify(`Updated ${res.count} link${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await reload();
  };

  const handleStart = useCallback(async (id: string) => {
    const res = await startPipelineTaskAction(id);
    if (!res.ok) { notify(res.error || "Could not start task."); return; }
    notify("Task started — now in progress.");
    await reload();
  }, [reload, notify]);

  // Only the members actually assigned to the selected tasks are offered as
  // move targets (stage forward AND move back) — never the whole team.
  const stageCandidates = useMemo(() => {
    const seen = new Map<string, StageOption>();
    for (const sid of selected) {
      const t = allTaskRows.find((row) => row.id === sid);
      if (!t) continue;
      for (const a of t.assignees || []) {
        if (!seen.has(a.id)) seen.set(a.id, { id: a.id, full_name: a.name, role_label: a.role_label ?? "" });
      }
    }
    return [...seen.values()];
  }, [selected, allTaskRows]);

  const bulkStatusOptions = TASK_STATUS_FLOW.map((s) => ({
    value: s,
    label: STATUS_META[s]?.label || s,
  }));

  const activeCount = board.active.length;
  const completedCount = board.completed.length;

  const sortedActive = useMemo(
    () =>
      [...board.active].sort((a, b) => {
        // Urgent review tasks float to the very top for EVERY role (super admin, PM, employee):
        // client_feedback (client waiting) > submitted (awaiting review/QC) > everything else
        // Inside same priority, nearest deadline first — then newest created.
        const pri = (s: string) => (s === "client_feedback" ? 0 : s === "submitted" ? 1 : 2);
        const pa = pri(a.status);
        const pb = pri(b.status);
        if (pa !== pb) return pa - pb;
        const ka = new Date(`${a.due_date}T00:00:00`).getTime();
        const kb = new Date(`${b.due_date}T00:00:00`).getTime();
        if (ka !== kb) {
          if (!Number.isFinite(ka)) return 1;
          if (!Number.isFinite(kb)) return -1;
          return ka - kb;
        }
        return a.created_at > b.created_at ? -1 : 1;
      }),
    [board.active]
  );

  const { filteredActive, filteredCompleted } = useMemo(
    () => ({
      filteredActive: sortedActive.filter(af.matches),
      filteredCompleted: board.completed.filter(af.matches),
    }),
    [sortedActive, board.completed, af.matches]
  );

  // Group active tasks by project for the "Projects" layout. A project key is
  // stable per project_id (falls back to name+client so a shared-name project
  // across two clients still groups to the right bucket).
  const projectKey = (t: Task) => t.project_id || `${t.client_id || ""}|${t.project_name || ""}`;

  const projectGroups = useMemo(() => {
    const groups = new Map<string, { key: string; projectId: string; projectName: string; clientName: string; tasks: Task[] }>();
    for (const task of filteredActive) {
      const key = projectKey(task);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          projectId: task.project_id,
          projectName: task.project_name || "Untitled project",
          clientName: clientName(task).trim(),
          tasks: [],
        });
      }
      groups.get(key)!.tasks.push(task);
    }
    return [...groups.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [filteredActive]);

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
              {isManager && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all tasks"
                    checked={filteredActive.length > 0 && selected.length === filteredActive.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selected.length > 0 && selected.length < filteredActive.length;
                    }}
                    onChange={() =>
                      setSelected((prev) =>
                        prev.length === filteredActive.length ? [] : filteredActive.map((t) => t.id)
                      )
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 accent-emerald-400 cursor-pointer"
                  />
                </th>
              )}
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
            {filteredActive.map((t) => (
              <PipelineActiveRow
                key={t.id}
                t={t}
                isManager={isManager}
                isSelected={selected.includes(t.id)}
                onOpen={openActive}
                onToggleSelect={toggleSelectId}
                onStart={handleStart}
                currentUserId={board.userId}
              />
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
              {canBulkStage && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Move Back</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredCompleted.map((t) => (
              <PipelineHistoryRow
                key={t.id}
                t={t}
                canReopen={board.canReopen}
                canMoveBack={canBulkStage}
                isPending={isPending}
                onOpen={openHistory}
                onReopen={reopenTask}
                onMoveBack={moveBackTask}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ---- Mobile stacked cards ----
  const activeMobile = (
    <div className="space-y-2.5">
      {filteredActive.map((t) => (
        <PipelineActiveMobileCard
          key={t.id}
          t={t}
          isManager={isManager}
          isSelected={selected.includes(t.id)}
          onOpen={openActive}
          onToggleSelect={toggleSelectId}
          onStart={handleStart}
          currentUserId={board.userId}
        />
      ))}
    </div>
  );

  const historyMobile = (
    <div className="space-y-2.5">
      {filteredCompleted.map((t) => (
        <PipelineHistoryMobileCard key={t.id} t={t} onOpen={openHistory} />
      ))}
    </div>
  );

  // ---- Projects grouped view: single-column table — one row per project,
  // first line = Company, second line = Project (same column), like a table.
  const projectsGrid = (
    <div className="card overflow-hidden">
      <div className="divide-y divide-white/[0.06]">
        {projectGroups.map((g) => {
          const inQc = g.tasks.some((t) => t.status === "submitted");
          const overdue = g.tasks.some((t) => isOverdue(t));
          const done = board.completed.filter((t) => projectKey(t) === g.key).length;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setOpenProject({ projectId: g.projectId, projectName: g.projectName })}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              <span className="hidden sm:flex h-9 w-9 rounded-lg bg-brand-300/10 items-center justify-center shrink-0">
                <FolderKanban className="h-4 w-4 text-brand-300" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 truncate leading-tight">{g.clientName || "—"}</div>
                <div className="text-sm font-semibold text-white truncate leading-tight mt-0.5">{g.projectName}</div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                  <Layers className="h-3 w-3" /> {g.tasks.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <Check className="h-3 w-3" /> {done} done
                </span>
                {inQc && <QcPill />}
                {overdue && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                    <AlertTriangle className="h-3 w-3" /> Overdue
                  </span>
                )}
              </div>
              {/* mobile: compact counts */}
              <span className="sm:hidden inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 shrink-0">
                {g.tasks.length}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );

  // ---- Unified Projects modal: single modal with navigation (list ↔ detail) ----
  const openProjectGroup = openProject
    ? projectGroups.find((g) => g.projectId === openProject.projectId) || null
    : null;

  const unifiedProjectModal = openProjectGroup ? (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={() => {
          setOpenProject(null);
          setProjectTask(null);
        }}
      />
      <div
        className={`relative w-full bg-night-850 border-white/10 shadow-2xl flex flex-col overflow-hidden ${
          isMobile
            ? "bottom-sheet h-[100dvh] max-h-[100dvh] border-t md:hidden rounded-t-2xl"
            : "modal-pop rounded-2xl border max-w-2xl md:max-h-[85vh]"
        }`}
      >
        {!projectTask ? (
          <>
            <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-400 mb-0.5">
                  {openProjectGroup.clientName}
                  {openProjectGroup.clientName ? " · " : ""}
                  {openProjectGroup.tasks.length} subtask{openProjectGroup.tasks.length === 1 ? "" : "s"}
                </div>
                <div className="text-base font-bold text-white leading-snug truncate">{openProjectGroup.projectName}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpenProject(null);
                  setProjectTask(null);
                }}
                className="h-8 w-8 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-300" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {openProjectGroup.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (canBulkStage) setProjectTask(t);
                    else {
                      setOpenProject(null);
                      setProjectTask(null);
                      setActiveTask(t);
                    }
                  }}
                  className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                    isOverdue(t)
                      ? "border-rose-500/40 bg-rose-500/[0.08] hover:bg-rose-500/[0.13]"
                      : t.status === "submitted"
                        ? "border-violet-300/40 bg-violet-400/[0.08] hover:bg-violet-400/[0.12]"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white leading-snug line-clamp-2">{t.title}</p>
                    {t.status === "submitted" && <QcPill />}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300 shrink-0">
                        {initials(stageLabel(t) === "Unassigned" ? "" : stageLabel(t))}
                      </span>
                      <span className="text-xs text-slate-300 truncate max-w-[120px]">{stageLabel(t)}</span>
                    </span>
                    <span className="w-px h-4 bg-white/10 shrink-0" />
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                    <span className={`ml-auto inline-flex items-center gap-1 text-xs whitespace-nowrap ${isOverdue(t) ? "text-rose-300 font-semibold" : "text-slate-400"}`}>
                      {isOverdue(t) ? (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> {fmtDate(t.due_date)}
                        </>
                      ) : (
                        <>
                          <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(t.due_date)}
                        </>
                      )}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <TaskModal
            key={projectTask.id}
            task={projectTask}
            team={team}
            isMobile={isMobile}
            canManageTeam={board.canManage}
            canApprove={board.canApprove}
            roleKey={board.roleKey}
            userId={board.userId}
            onClose={() => {
              setProjectTask(null);
              setOpenProject(null);
            }}
            onBack={() => setProjectTask(null)}
            embedded
            refresh={reload}
            siblingTasks={openProjectGroup.tasks}
          />
        )}
      </div>
    </div>
  ) : null;

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
          {canBulkStage && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await moveBackPipelineTaskAction(historyTask.id);
                  if (!res.ok) return notify(res.error || "Could not move back.");
                  await reload();
                  notify("Moved back one stage.");
                  setHistoryTask(null);
                })
              }
              className="btn-ghost w-full !py-2.5 text-sm"
            >
              <Undo2 className="h-4 w-4" /> Move Back one stage
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

      {/* Tabs + Filters */}
      <div className="mb-4 shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setTab("active")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shrink-0 ${
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shrink-0 ${
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
          {tab === "active" && (
            <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5 ring-1 ring-white/10 shrink-0 self-start sm:self-auto sm:ml-auto">
              <button
                type="button"
                onClick={() => setView("projects")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "projects" ? "bg-brand-300 text-night-950" : "text-slate-300 hover:bg-white/[0.06]"
                }`}
                aria-pressed={view === "projects"}
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Projects
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "list" ? "bg-brand-300 text-night-950" : "text-slate-300 hover:bg-white/[0.06]"
                }`}
                aria-pressed={view === "list"}
              >
                <Layers className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          )}
        </div>

        <AdvancedFilterBar api={af} />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><ArrowRight className="h-3 w-3 text-brand-300" /> A → B → C sequence</span>
          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3 text-emerald-300" /> Complete auto-assigns next stage</span>
          <span className="inline-flex items-center gap-1"><Undo2 className="h-3 w-3 text-rose-300" /> Send Back moves a stage backward</span>
        </div>
      </div>

      {tab === "active" ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {sortedActive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Layers className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No active tasks</p>
              <p className="text-sm text-slate-500 mt-1">Everything is complete or assigned elsewhere.</p>
            </div>
          ) : filteredActive.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No active tasks match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting search, client, project, stage, status or priority.</p>
              <button type="button" onClick={af.clearAll} className="mt-3 btn-ghost !py-1.5 text-xs">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            </div>
          ) : (
            <>
              {isManager && view === "list" && (
                <div className="mb-2">
                  <BulkActionBar
                    selectedCount={selected.length}
                    team={team}
                    canAssign
                    canDelete
                    canStage={canBulkStage}
                    canDeadline={isManager}
                    canBulkEdit={false}
                    statusOptions={[]}
                    onAssign={bulkAssign}
                    onDelete={bulkDelete}
                    onStatus={async () => {}}
                    onStage={bulkStage}
                    onDeadline={bulkDeadline}
                    stageOptions={stageCandidates}
                    onClear={() => setSelected([])}
                  />
                </div>
              )}
              {view === "projects" ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500">
                    {projectGroups.length} project{projectGroups.length === 1 ? "" : "s"} — open one to see its subtasks.
                  </p>
                  {projectsGrid}
                </div>
              ) : (
                <>
                  <div className="hidden md:block">{activeTable}</div>
                  <div className="md:hidden">{activeMobile}</div>
                </>
              )}
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
          ) : filteredCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No completed tasks match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting search, client, project, stage, status or priority.</p>
              <button type="button" onClick={af.clearAll} className="mt-3 btn-ghost !py-1.5 text-xs">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block">{historyTable}</div>
              <div className="md:hidden">{historyMobile}</div>
            </>
          )}
        </div>
      )}

      {/* Full modal — List tab uses old full-view modal (TaskModalFull) with 3-button row */}
      {activeTask && (
        <TaskModalFull
          key={activeTask.id}
          task={activeTask}
          team={team}
          isMobile={isMobile}
          canManageTeam={board.canManage}
          canApprove={board.canApprove}
          roleKey={board.roleKey}
          userId={board.userId}
          onClose={() => setActiveTask(null)}
          refresh={reload}
        />
      )}
      {historyModal}
      {unifiedProjectModal}
    </div>
  );
}
