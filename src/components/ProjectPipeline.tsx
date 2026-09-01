"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  Layers,
  History,
  Check,
  Undo2,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  ArrowRight,
  Search,
  Filter,
  X,
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

const clientName = (t: Task) => t.client_company || t.client_name || "";

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

/** Global search: searches across client, project, task, person/stage, status, priority, deadline. */
function GlobalSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search client, project, task, person, status, priority, deadline…"
        aria-label="Search tasks"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-8 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-brand-300/50 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 py-2 pl-3 pr-8 text-sm text-white transition-colors focus:border-brand-300/50 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
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

  // Filters: global search + per-column dropdowns (client-side, instant)
  const [query, setQuery] = useState("");
  const [fltClient, setFltClient] = useState("");
  const [fltProject, setFltProject] = useState("");
  const [fltStatus, setFltStatus] = useState("");
  const [fltPriority, setFltPriority] = useState("");
  const [fltStage, setFltStage] = useState("");
  const [fltDeadline, setFltDeadline] = useState("");

  const isMobile = useIsMobile();
  const searchParams = useSearchParams();

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

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
    setBoard(next);
  }, []);

  const activeCount = board.active.length;
  const completedCount = board.completed.length;

  const sortedActive = useMemo(
    () =>
      [...board.active].sort((a, b) => {
        // Tasks awaiting QC review float to the top so the gatekeeper sees them.
        if (a.status === "submitted" && b.status !== "submitted") return -1;
        if (b.status === "submitted" && a.status !== "submitted") return 1;
        return a.created_at < b.created_at ? -1 : 1;
      }),
    [board.active]
  );

  const clientOptions = useMemo(() => {
    const names = new Set<string>();
    for (const t of [...board.active, ...board.completed]) {
      const n = clientName(t).trim();
      if (n) names.add(n);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [board.active, board.completed]);

  const projectOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of [...board.active, ...board.completed]) if (t.project_name?.trim()) s.add(t.project_name.trim());
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [board.active, board.completed]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of [...board.active, ...board.completed]) if (t.status) s.add(t.status);
    return [...s].sort();
  }, [board.active, board.completed]);

  const priorityOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of [...board.active, ...board.completed]) if ((t as any).priority) s.add(String((t as any).priority));
    return [...s].sort();
  }, [board.active, board.completed]);

  const stageOptions = useMemo(() => {
    const s = new Set<string>();
    const label = (t: Task) => {
      if (t.status === "completed") return "Completed";
      const step = (t as any).current_step ?? 0;
      const seq: any[] = (t as any).assignees || [];
      if (seq.length === 0) return "Unassigned";
      const idx = Math.min(step, seq.length - 1);
      return seq[idx]?.name || "Unassigned";
    };
    for (const t of [...board.active, ...board.completed]) {
      const l = label(t);
      if (l && l !== "Unassigned") s.add(l);
      for (const a of ((t as any).assignees || []) as any[]) if (a?.name) s.add(a.name);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [board.active, board.completed]);

  const deadlineOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of [...board.active, ...board.completed]) {
      const d = fmtDate(t.due_date);
      if (d && d !== "—") s.add(d);
    }
    return [...s].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [board.active, board.completed]);

  const hasActiveFilters = !!(query.trim() || fltClient || fltProject || fltStatus || fltPriority || fltStage || fltDeadline);
  const clearAllFilters = () => {
    setQuery("");
    setFltClient("");
    setFltProject("");
    setFltStatus("");
    setFltPriority("");
    setFltStage("");
    setFltDeadline("");
  };

  const { filteredActive, filteredCompleted } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const stageOf = (t: Task) => {
      if (t.status === "completed") return "completed";
      const step = (t as any).current_step ?? 0;
      const seq: any[] = (t as any).assignees || [];
      if (seq.length === 0) return "unassigned";
      const idx = Math.min(step, seq.length - 1);
      return String(seq[idx]?.name || "Unassigned").toLowerCase();
    };
    const matches = (t: Task) => {
      if (fltClient && clientName(t) !== fltClient) return false;
      if (fltProject && t.project_name !== fltProject) return false;
      if (fltStatus && t.status !== fltStatus) return false;
      if (fltPriority && String((t as any).priority) !== fltPriority) return false;
      if (fltDeadline && fmtDate(t.due_date) !== fltDeadline) return false;
      if (fltStage) {
        const st = stageOf(t);
        const assignees: string[] = ((t as any).assignees || []).map((a: any) => String(a.name || "").toLowerCase());
        if (st !== fltStage.toLowerCase() && !assignees.includes(fltStage.toLowerCase())) return false;
      }
      if (q) {
        const hay = [
          clientName(t),
          t.project_name || "",
          t.title || "",
          stageOf(t),
          ((t as any).assignees || []).map((a: any) => a.name).join(" "),
          t.status || "",
          String((t as any).priority || ""),
          t.due_date ? fmtDate(t.due_date) : "",
          (t.due_date || "").slice(0, 10),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    return {
      filteredActive: sortedActive.filter(matches),
      filteredCompleted: board.completed.filter(matches),
    };
  }, [sortedActive, board.completed, query, fltClient, fltProject, fltStatus, fltPriority, fltStage, fltDeadline]);

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
            {filteredActive.map((t) => (
              <tr
                key={t.id}
                onClick={() => setActiveTask(t)}
                className={`transition-colors cursor-pointer ${
                  t.status === "submitted"
                    ? "bg-violet-400/[0.07] hover:bg-violet-400/[0.12]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <td className="px-4 py-3 text-xs text-slate-300">{t.client_company || t.client_name}</td>
                <td className="px-4 py-3 text-xs text-slate-300">{t.project_name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="max-w-[260px] truncate text-sm font-medium text-white">{t.title}</div>
                    {t.status === "submitted" && <QcPill />}
                  </div>
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
            {filteredCompleted.map((t) => (
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
      className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
        t.status === "submitted"
          ? "border-violet-300/40 bg-violet-400/[0.08]"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{t.client_company || t.client_name} · {t.project_name}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {t.status === "submitted" && <QcPill />}
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
      {filteredActive.map((t) => mobileCard(t, false))}
    </div>
  );

  const historyMobile = (
    <div className="space-y-2.5">
      {filteredCompleted.map((t) => mobileCard(t, true))}
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

      {/* Tabs + Filters */}
      <div className="mb-4 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
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

          {/* Desktop: global search aligned right of tabs */}
          <div className="flex-1 min-w-[220px] max-w-sm ml-auto hidden md:block">
            <GlobalSearchInput value={query} onChange={setQuery} />
          </div>
        </div>

        {/* Mobile: full-width search below tabs */}
        <div className="md:hidden">
          <GlobalSearchInput value={query} onChange={setQuery} />
        </div>

        {/* Per-column dropdown filters — covers client, project, stage/person, deadline, status, priority + global search covers task name & all */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          <div className="min-w-[130px] flex-1 max-w-[160px]">
            <FilterSelect value={fltClient} onChange={setFltClient} options={clientOptions} placeholder="Client" />
          </div>
          <div className="min-w-[130px] flex-1 max-w-[160px]">
            <FilterSelect value={fltProject} onChange={setFltProject} options={projectOptions} placeholder="Project" />
          </div>
          <div className="min-w-[130px] flex-1 max-w-[160px]">
            <FilterSelect value={fltStage} onChange={setFltStage} options={stageOptions} placeholder="Stage / Person" />
          </div>
          <div className="min-w-[120px] w-[140px]">
            <FilterSelect value={fltDeadline} onChange={setFltDeadline} options={deadlineOptions} placeholder="Deadline" />
          </div>
          <div className="min-w-[120px] w-[140px]">
            <FilterSelect value={fltStatus} onChange={setFltStatus} options={statusOptions} placeholder="Status" />
          </div>
          <div className="min-w-[120px] w-[140px]">
            <FilterSelect value={fltPriority} onChange={setFltPriority} options={priorityOptions} placeholder="Priority" />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>

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
              <button type="button" onClick={clearAllFilters} className="mt-3 btn-ghost !py-1.5 text-xs">
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
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
          ) : filteredCompleted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="h-10 w-10 text-brand-300/40 mb-3" />
              <p className="font-medium text-slate-200">No completed tasks match your filters</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting search, client, project, stage, status or priority.</p>
              <button type="button" onClick={clearAllFilters} className="mt-3 btn-ghost !py-1.5 text-xs">
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

      {activeTask && (
        <TaskModal
          key={activeTask.id}
          task={activeTask}
          team={team}
          isMobile={isMobile}
          canManageTeam={board.canManage}
          canApprove={board.canApprove}
          roleKey={board.roleKey}
          onClose={() => setActiveTask(null)}
          refresh={reload}
        />
      )}
      {historyModal}
    </div>
  );
}
