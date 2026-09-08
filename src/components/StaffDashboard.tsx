"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlayCircle, Clock, CheckCircle2, MoreVertical, AlertTriangle } from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { TASK_STATUS_FLOW } from "@/lib/types";
import { StatusBadge, PriorityBadge, STATUS_ORDER, STATUS_META, PRIORITY_META, DeadlineBadge } from "@/components/ui";
import { useAdvancedFilters, AdvancedFilterBar, taskStageValues } from "@/components/AdvancedFilterBar";
import { useSilentPoll } from "@/lib/useSilentPoll";
import { isOverdue } from "@/lib/deadlines";
import { formatClientName } from "@/lib/utils";
import TaskModal from "@/components/TaskModal";
import BulkActionBar from "@/components/BulkActionBar";
import { useToast } from "@/components/Toast";
import {
  bulkAssignPipelineTeamAction,
  bulkDeletePipelineTasksAction,
  bulkSetPipelineStatusAction,
} from "@/lib/actions/pipeline";
import { hasPermission } from "@/lib/permissions";

function taskTypeLabel(groupKey: string | null): string {
  if (!groupKey || groupKey === "manual") return "Task";
  return groupKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

export default function StaffDashboard({
  tasks,
  team,
  roleKey,
  userId,
  permissions,
}: {
  tasks: Task[];
  team: UserRow[];
  roleKey: string;
  userId: string;
  permissions?: string[];
}) {
  // Silent 3s background sync: refreshes only the task/team arrays feeding the
  // table & cards. Pages are never reloaded and modal/textarea state survives.
  // Cache-busted for mobile where fetch cache is aggressive.
  const live = useSilentPoll(
    { tasks, team },
    async () => {
      const res = await fetch(`/api/poll/data?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("poll failed");
      return (await res.json()) as { tasks: Task[]; team: UserRow[] };
    },
    3000
  );
  tasks = live.tasks;
  team = live.team;

  const [openTask, setOpenTask] = useState<Task | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const canManageTeam = hasPermission(permissions, "tasks:manage");
  const canApprove =
    canManageTeam || hasPermission(permissions, "tasks:review");
  // Managers (role key or tasks:manage) get bulk assign/delete/status.
  const isManager =
    canManageTeam ||
    ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "PM"].includes((roleKey || "").toUpperCase());
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deep-link routing: ?taskId=xxx auto-opens that task's modal (from notifications).
  const openedLinkId = useRef<string | null>(null);
  useEffect(() => {
    const id = searchParams.get("taskId");
    if (!id || openedLinkId.current === id) return;
    const found = tasks.find((t) => t.id === id);
    if (found) {
      openedLinkId.current = id;
      setOpenTask(found);
    }
  }, [searchParams, tasks]);

  const activeStatuses = ["in_progress", "submitted", "needs_improvement", "client_review", "client_feedback", "uploading", "approved"];

  const af = useAdvancedFilters(tasks, {
    client: {
      id: (t) => t.client_id,
      label: (t) => formatClientName(t.client_company, t.client_name),
    },
    project: { value: (t) => t.project_name },
    stage: { values: taskStageValues, exclude: ["Unassigned"] },
    deadline: {
      date: (t) => t.due_date,
      completed: (t) => t.status === "completed",
    },
    status: { value: (t) => t.status, order: STATUS_ORDER },
    priority: { value: (t) => t.priority },
    searchText: (t) =>
      [
        formatClientName(t.client_company, t.client_name),
        t.project_name || "",
        t.title || "",
        taskStageValues(t).join(" "),
        t.status || "",
        STATUS_META[t.status]?.label || "",
        t.priority || "",
        PRIORITY_META[t.priority]?.label || "",
        t.due_date || "",
      ].join(" "),
  });

  const metrics = [
    { label: "Active", value: tasks.filter((t) => activeStatuses.includes(t.status)).length, Icon: PlayCircle, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "Ready", value: tasks.filter((t) => t.status === "approved").length, Icon: Clock, cls: "text-amber-300 bg-amber-400/10" },
    { label: "Done", value: tasks.filter((t) => t.status === "completed" || t.status === "upload_done").length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => tasks.filter((t) => af.matches(t)), [tasks, af.matches]);

  const refresh = async () => {
    router.refresh();
  };

  // Prune bulk selection to rows that still exist.
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => tasks.some((t) => t.id === id)));
  }, [tasks]);

  const bulkAssign = async (memberIds: string[]) => {
    const res = await bulkAssignPipelineTeamAction(selected, memberIds);
    if (!res.ok) {
      toast(res.error || "Bulk assign failed.", "error");
      return;
    }
    toast(`Team updated on ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await refresh();
  };

  const bulkDelete = async () => {
    const res = await bulkDeletePipelineTasksAction(selected);
    if (!res.ok) {
      toast(res.error || "Bulk delete failed.", "error");
      return;
    }
    toast(`Deleted ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await refresh();
  };

  const bulkStatus = async (status: string) => {
    const res = await bulkSetPipelineStatusAction(selected, status as Task["status"]);
    if (!res.ok) {
      toast(res.error || "Bulk status update failed.", "error");
      return;
    }
    toast(`Updated ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await refresh();
  };

  const bulkStatusOptions = TASK_STATUS_FLOW.map((s) => ({
    value: s,
    label: STATUS_META[s]?.label || s,
  }));

  const mobileCard = (t: Task) => (
    <div
      key={t.id}
      role="button"
      tabIndex={0}
      onClick={() => setOpenTask(t)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpenTask(t);
        }
      }}
      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.title}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {formatClientName(t.client_company, t.client_name)} · {t.project_name}
          </p>
        </div>
        {isManager && (
          <input
            type="checkbox"
            aria-label={`Select ${t.title}`}
            checked={selected.includes(t.id)}
            onChange={() => toggleSelect(t.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 mt-1 accent-emerald-400 cursor-pointer shrink-0"
          />
        )}
        <MoreVertical className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <StatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
          {taskTypeLabel(t.group_key)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
        <DeadlineBadge task={t} />
        <span className={`inline-flex items-center gap-1 text-[11px] ${isOverdue(t) ? "text-rose-300 font-semibold" : "text-slate-500"}`}>
          {isOverdue(t) ? (
            <AlertTriangle className="h-3 w-3 text-rose-400" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          Due {t.due_date ? t.due_date.slice(0, 10) : "—"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-none space-y-3 pb-20 md:pb-0 overflow-x-hidden">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className={`card flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 ${m.cls}`}>
            <m.Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold leading-none">{m.value}</p>
              <p className="text-[10px] md:text-[11px] font-medium mt-1 opacity-80">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <AdvancedFilterBar api={af} />

      {filtered.length === 0 ? (
        <div className="card py-8 text-center">
          <p className="text-sm font-medium text-slate-300">
            {tasks.length === 0 ? "No assignments yet" : "No tasks match your filters."}
          </p>
          <p className="text-xs text-slate-500 mt-1">New tasks will appear here automatically.</p>
        </div>
      ) : (
        <>
          {isManager && (
            <BulkActionBar
              selectedCount={selected.length}
              team={team}
              canAssign
              canDelete
              statusOptions={bulkStatusOptions}
              statusLabel="Status"
              onAssign={bulkAssign}
              onDelete={bulkDelete}
              onStatus={bulkStatus}
              onClear={() => setSelected([])}
            />
          )}
          {/* Desktop: clickable table with truncation */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[880px]">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                    {isManager && (
                      <th className="px-3 py-2.5 w-10">
                        <input
                          type="checkbox"
                          aria-label="Select all tasks"
                          checked={filtered.length > 0 && selected.length === filtered.length}
                          ref={(el) => {
                            if (el) el.indeterminate = selected.length > 0 && selected.length < filtered.length;
                          }}
                          onChange={() =>
                            setSelected((prev) =>
                              prev.length === filtered.length ? [] : filtered.map((t) => t.id)
                            )
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 accent-emerald-400 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="px-4 py-2.5 min-w-[200px] sticky left-0 bg-night-850 z-20">Client</th>
                    <th className="px-3 py-2.5 min-w-[160px]">Project</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Task</th>
                    <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">Task Type</th>
                    <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">Status</th>
                    <th className="px-3 py-2.5 min-w-[130px] whitespace-nowrap">Priority</th>
                    <th className="px-3 py-2.5 w-32 whitespace-nowrap">Due</th>
                    <th className="px-3 py-2.5 w-16">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setOpenTask(t)}
                      className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                        isOverdue(t) ? "bg-rose-500/[0.07] hover:bg-rose-500/[0.12]" : ""
                      }`}
                    >
                      {isManager && (
                        <td className="px-3 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${t.title}`}
                            checked={selected.includes(t.id)}
                            onChange={() => toggleSelect(t.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 accent-emerald-400 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5 sticky left-0 bg-night-850 group-hover:bg-white/[0.03] z-[5]">
                        <span className="text-xs font-medium text-brand-300/90 block truncate max-w-[180px]">
                          {formatClientName(t.client_company, t.client_name)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-300 truncate block max-w-[140px]">{t.project_name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm text-white font-medium leading-tight truncate max-w-[180px]">{t.title}</p>
                        {isOverdue(t) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300 mt-0.5">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="badge bg-white/5 text-slate-300 border border-white/[0.06]">
                          {taskTypeLabel(t.group_key)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-xs tabular-nums ${isOverdue(t) ? "text-rose-300 font-semibold" : "text-slate-400"}`}>
                          {isOverdue(t) ? `${t.due_date?.slice(0, 10)} ⚠` : (t.due_date ? t.due_date.slice(0, 10) : "—")}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">
                        {(t.assignees || [])[(t.current_step ?? 0) % Math.max((t.assignees?.length || 1), 1)]?.name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile: touch-friendly stacked cards */}
          <div className="md:hidden space-y-2.5">
            {filtered.map((t) => mobileCard(t))}
          </div>
        </>
      )}

      {openTask && (
        <TaskModal
          key={openTask.id}
          task={openTask}
          team={team}
          isMobile={isMobile}
          canManageTeam={canManageTeam}
          canApprove={canApprove}
          roleKey={roleKey}
          onClose={() => setOpenTask(null)}
          refresh={refresh}
        />
      )}
    </div>
  );
}
