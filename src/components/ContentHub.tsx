"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Clock, Send, CheckCircle2, Filter, ChevronDown, MoreVertical } from "lucide-react";
import type { Task, UserRow, ContentStatus } from "@/lib/types";
import { CONTENT_STATUSES } from "@/lib/types";
import { ContentStatusBadge } from "@/components/ui";
import { formatClientName } from "@/lib/utils";
import TaskModal from "@/components/TaskModal";
import BulkActionBar from "@/components/BulkActionBar";
import { useToast } from "@/components/Toast";
import {
  setPipelineTaskContentStatusAction,
  bulkAssignPipelineTeamAction,
  bulkDeletePipelineTasksAction,
  bulkSetPipelineContentStatusAction,
} from "@/lib/actions/pipeline";
import { hasPermission } from "@/lib/permissions";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "PM"];
const EDITOR_ROLES = [...MANAGER_ROLES, "WRITER", "CONTENT_WRITER"];

function isManagerRole(roleKey?: string | null): boolean {
  return !!roleKey && MANAGER_ROLES.includes(roleKey.toUpperCase());
}

function isContentEditorRole(roleKey?: string | null, permissions?: string[]): boolean {
  if (!!roleKey && EDITOR_ROLES.includes(roleKey.toUpperCase())) return true;
  return hasPermission(permissions, "tasks:manage");
}

/** NULL reads as Pending. */
function contentStatusOf(t: Task): ContentStatus {
  const s = (t.content_status || "pending") as ContentStatus;
  return CONTENT_STATUSES.some((c) => c.key === s) ? s : "pending";
}

/** Current holder of the task (stage person), falling back to the assignee. */
function assigneeOf(t: Task): string {
  const seq = t.assignees || [];
  if (seq.length > 0) {
    const idx = Math.min(t.current_step ?? 0, seq.length - 1);
    if (seq[idx]?.name) return seq[idx].name;
  }
  return t.assignee_name || "—";
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

export default function ContentHub({
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const canManageTeam = hasPermission(permissions, "tasks:manage");
  const canApprove = canManageTeam || hasPermission(permissions, "tasks:review");
  // Writers can edit content + change (content) status, but can never delete/assign.
  const canEditContent = isContentEditorRole(roleKey, permissions);
  const isManager = isManagerRole(roleKey) || canManageTeam;

  const [selected, setSelected] = useState<string[]>([]);
  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  // Deep-link routing: ?taskId=xxx auto-opens that task's modal (from notifications).
  // Completed content lands on the History tab first.
  const openedLinkId = useRef<string | null>(null);
  useEffect(() => {
    const id = searchParams.get("taskId");
    if (!id || openedLinkId.current === id) return;
    const found = tasks.find((t) => t.id === id);
    if (found) {
      openedLinkId.current = id;
      setTab(found.status === "completed" ? "history" : "active");
      setOpenTask(found);
    }
  }, [searchParams, tasks]);

  const FILTERS = [{ key: "", label: "All" }, ...CONTENT_STATUSES.map((c) => ({ key: c.key, label: c.label }))];

  const metrics = [
    { label: "Pending", value: tasks.filter((t) => contentStatusOf(t) === "pending").length, Icon: FileText, cls: "text-slate-300 bg-white/[0.05]" },
    { label: "In Process", value: tasks.filter((t) => contentStatusOf(t) === "in_process").length, Icon: Clock, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "In Approval", value: tasks.filter((t) => contentStatusOf(t) === "approval").length, Icon: Send, cls: "text-violet-300 bg-violet-400/10" },
    { label: "Uploaded", value: tasks.filter((t) => contentStatusOf(t) === "uploaded_scheduled").length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const inTab = tasks.filter((t) =>
      tab === "history" ? t.status === "completed" : t.status !== "completed"
    );
    return inTab.filter((t) => {
      if (statusFilter && contentStatusOf(t) !== statusFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.project_name.toLowerCase().includes(q) ||
        formatClientName(t.client_company, t.client_name).toLowerCase().includes(q) ||
        assigneeOf(t).toLowerCase().includes(q)
      );
    });
  }, [tasks, search, statusFilter, tab]);

  const activeCount = tasks.filter((t) => t.status !== "completed").length;
  const historyCount = tasks.filter((t) => t.status === "completed").length;

  const switchTab = (next: "active" | "history") => {
    setTab(next);
    setSelected([]);
    setStatusFilter("");
  };

  const tabCounts = FILTERS.map((f) => ({
    ...f,
    count: f.key ? tasks.filter((t) => contentStatusOf(t) === f.key).length : tasks.length,
  }));

  const refresh = async () => {
    router.refresh();
  };

  // Prune bulk selection to rows that still exist.
  useEffect(() => {
    setSelected((prev) => prev.filter((id) => tasks.some((t) => t.id === id)));
  }, [tasks]);

  const setSingleStatus = async (taskId: string, status: ContentStatus) => {
    const res = await setPipelineTaskContentStatusAction(taskId, status);
    if (!res.ok) {
      toast(res.error || "Could not update content status.", "error");
      return;
    }
    toast("Content status updated.");
    await refresh();
  };

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
    const res = await bulkSetPipelineContentStatusAction(selected, status as ContentStatus);
    if (!res.ok) {
      toast(res.error || "Bulk status update failed.", "error");
      return;
    }
    toast(`Updated ${res.count} task${res.count === 1 ? "" : "s"}.`);
    setSelected([]);
    await refresh();
  };

  const mobileCard = (t: Task) => (
    <button
      key={t.id}
      type="button"
      onClick={() => setOpenTask(t)}
      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors active:scale-[0.99]"
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
        <ContentStatusBadge status={contentStatusOf(t)} />
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
          {assigneeOf(t)}
        </span>
      </div>
    </button>
  );

  return (
    <div className="w-full max-w-none space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {metrics.map((m) => (
          <div key={m.label} className={`card flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 ${m.cls}`}>
            <m.Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold leading-none">{m.value}</p>
              <p className="text-[10px] md:text-[11px] font-medium mt-1 opacity-80 truncate">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTab("active")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "active"
                ? "bg-brand-300 text-night-950"
                : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
            }`}
          >
            <FileText className="h-4 w-4" />
            Active Content
            <span className={`text-xs font-semibold ${tab === "active" ? "text-night-900" : "text-slate-500"}`}>
              {activeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("history")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === "history"
                ? "bg-brand-300 text-night-950"
                : "bg-white/[0.04] text-slate-300 hover:bg-white/10"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            History
            <span className={`text-xs font-semibold ${tab === "history" ? "text-night-900" : "text-slate-500"}`}>
              {historyCount}
            </span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search content, projects, clients, assignees…"
          className="input !py-1.5 text-xs w-full sm:max-w-xs"
        />
        {/* Desktop: scrollable pills */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {tabCounts.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => setStatusFilter(statusFilter === tab.key ? "" : tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                statusFilter === tab.key
                  ? "bg-brand-300 text-night-950 shadow-sm"
                  : "bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50 hover:text-brand-200"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === tab.key ? "bg-brand-300/20 text-brand-300" : "bg-white/10 text-slate-400"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        {/* Mobile: dropdown with filter icon */}
        <div className="md:hidden relative">
          <button
            onClick={() => setFilterOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300"
          >
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Filter: {FILTERS.find((f) => f.key === statusFilter)?.label || "All"}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-slate-400">
              {tabCounts.find((t) => t.key === statusFilter)?.count ?? tasks.length}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
          </button>
          {filterOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
              <div className="absolute z-20 mt-2 w-56 rounded-xl border border-white/10 bg-night-850 shadow-xl shadow-black/40 overflow-hidden">
                {tabCounts.map((tab) => (
                  <button
                    key={tab.key || "all"}
                    onClick={() => { setStatusFilter(tab.key); setFilterOpen(false); }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${
                      statusFilter === tab.key ? "bg-brand-300/10 text-brand-300" : "text-slate-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === tab.key ? "bg-brand-300/20 text-brand-300" : "bg-white/10 text-slate-400"}`}>{tab.count}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card py-8 text-center">
          <p className="text-sm font-medium text-slate-300">
            {tasks.length === 0
              ? "No content tasks yet"
              : tab === "history"
                ? "No completed content yet"
                : "No content matches your search."}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {tab === "history"
              ? "Completed content lands here."
              : "Content appears here once projects with content deliverables are created."}
          </p>
        </div>
      ) : (
        <>
          {(isManager || canEditContent) && (
            <BulkActionBar
              selectedCount={selected.length}
              team={team}
              canAssign={isManager}
              canDelete={isManager}
              statusOptions={canEditContent ? CONTENT_STATUSES.map((c) => ({ value: c.key, label: c.label })) : []}
              statusLabel="Content Status"
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
                          aria-label="Select all content tasks"
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
                    <th className="px-4 py-2.5 min-w-[160px] sticky left-0 bg-night-850 z-20">Client</th>
                    <th className="px-3 py-2.5 min-w-[160px]">Project</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Task Title</th>
                    <th className="px-3 py-2.5 min-w-[140px] whitespace-nowrap">Assignee</th>
                    <th className="px-3 py-2.5 min-w-[170px] whitespace-nowrap">Content Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setOpenTask(t)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
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
                      <td className="px-4 py-2.5 sticky left-0 bg-night-850 z-[5]">
                        <span className="text-xs font-medium text-brand-300/90 block truncate max-w-[180px]">
                          {formatClientName(t.client_company, t.client_name)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-300 truncate block max-w-[140px]">{t.project_name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm text-white font-medium leading-tight truncate max-w-[200px]">{t.title}</p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="text-xs text-slate-300">{assigneeOf(t)}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex items-center gap-2">
                          <ContentStatusBadge status={contentStatusOf(t)} />
                          {canEditContent && (
                            <select
                              aria-label={`Change content status for ${t.title}`}
                              value={contentStatusOf(t)}
                              onChange={(e) => setSingleStatus(t.id, e.target.value as ContentStatus)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-white/10 bg-night-900 px-1.5 py-1 text-[11px] text-slate-300 focus:border-brand-300/50 focus:outline-none cursor-pointer"
                            >
                              {CONTENT_STATUSES.map((c) => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                              ))}
                            </select>
                          )}
                        </span>
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
