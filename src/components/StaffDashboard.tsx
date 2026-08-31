"use client";

import { useState, useMemo } from "react";
import { PlayCircle, Clock, CheckCircle2, Filter, ChevronDown, MoreVertical } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { TaskActions, TaskDetails } from "@/components/TaskWorkflow";
import { formatClientName } from "@/lib/utils";

function taskTypeLabel(groupKey: string | null): string {
  if (!groupKey || groupKey === "manual") return "Task";
  return groupKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StaffDashboard({
  tasks,
  roleKey,
  userId,
  permissions,
}: {
  tasks: Task[];
  roleKey: string;
  userId: string;
  permissions?: string[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const activeStatuses = ["in_progress", "submitted", "needs_improvement", "client_review", "client_feedback", "client_approved", "uploading", "approved"];

  const FILTERS = [
    { key: "", label: "All" },
    { key: "in_progress", label: "Active" },
    { key: "approved", label: "Ready to Start" },
    { key: "submitted", label: "Awaiting Review" },
    { key: "needs_improvement", label: "Improvement Needed" },
    { key: "completed", label: "Done" },
  ];

  const metrics = [
    { label: "Active", value: tasks.filter((t) => activeStatuses.includes(t.status)).length, Icon: PlayCircle, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "Ready", value: tasks.filter((t) => t.status === "approved").length, Icon: Clock, cls: "text-amber-300 bg-amber-400/10" },
    { label: "Done", value: tasks.filter((t) => t.status === "completed" || t.status === "upload_done").length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter) {
        if (statusFilter === "completed") {
          if (t.status !== "completed" && t.status !== "upload_done") return false;
        } else if (t.status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.project_name.toLowerCase().includes(q) ||
        formatClientName(t.client_company, t.client_name).toLowerCase().includes(q)
      );
    });
  }, [tasks, search, statusFilter]);

  const tabCounts = FILTERS.map((f) => ({
    ...f,
    count: f.key
      ? f.key === "completed"
        ? tasks.filter((t) => t.status === "completed" || t.status === "upload_done").length
        : tasks.filter((t) => t.status === f.key).length
      : tasks.length,
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
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

      <div className="space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks, projects, clients…"
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
            {tasks.length === 0 ? "No assignments yet" : "No tasks match your search."}
          </p>
          <p className="text-xs text-slate-500 mt-1">New tasks will appear here automatically.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[880px]">
              <thead className="sticky top-0 z-10">
                <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                  <th className="px-4 py-2.5 min-w-[200px] sticky left-0 bg-night-850 z-20">Client</th>
                  <th className="px-3 py-2.5 min-w-[160px]">Project</th>
                  <th className="px-3 py-2.5 min-w-[200px]">Task</th>
                  <th className="px-3 py-2.5 w-32">Task Type</th>
                  <th className="px-3 py-2.5 w-32">Status</th>
                  <th className="px-3 py-2.5 w-28">Priority</th>
                  <th className="px-3 py-2.5 w-32">Due</th>
                  <th className="px-3 py-2.5 w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((t) => (
                  <FragmentRow
                    key={t.id}
                    task={t}
                    roleKey={roleKey}
                    userId={userId}
                    permissions={permissions}
                    open={openTaskId === t.id}
                    onToggle={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  task: t,
  roleKey,
  userId,
  permissions,
  open,
  onToggle,
}: {
  task: Task;
  roleKey: string;
  userId: string;
  permissions?: string[];
  open: boolean;
  onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <tr
        onClick={onToggle}
        className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
      >
        <td className="px-4 py-2.5 sticky left-0 bg-night-850 group-hover:bg-white/[0.03] z-[5]">
          <span className="text-xs font-medium text-brand-300/90 block truncate max-w-[190px]">
            {formatClientName(t.client_company, t.client_name)}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span className="text-xs text-slate-300 truncate block max-w-[150px]">{t.project_name}</span>
        </td>
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm text-white font-medium leading-tight truncate max-w-[190px]">{t.title}</p>
        </td>
        <td className="px-3 py-2.5">
          <span className="badge bg-white/5 text-slate-300 border border-white/[0.06]">
            {taskTypeLabel(t.group_key)}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <StatusBadge status={t.status} />
        </td>
        <td className="px-3 py-2.5">
          <PriorityBadge priority={t.priority} />
        </td>
        <td className="px-3 py-2.5">
          <span className="text-xs tabular-nums text-slate-400">
            {t.due_date ? t.due_date.slice(0, 10) : "—"}
          </span>
        </td>
        <td className="px-3 py-2.5 relative" onClick={(e) => e.stopPropagation()}>
          <div className="relative inline-block">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-white/10 bg-night-800 shadow-2xl z-20 py-1 text-xs">
                <button
                  onClick={() => { setMenuOpen(false); onToggle(); }}
                  className="w-full text-left px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Open details
                </button>
                <div className="border-t border-white/[0.06] px-2 py-1">
                  <TaskActions
                    task={t}
                    roleKey={roleKey}
                    userId={userId}
                    permissions={permissions}
                    onExpand={(id) => { setMenuOpen(false); onToggle(); }}
                  />
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-white/[0.03]">
          <td colSpan={8} className="px-4 py-3">
            <TaskDetails task={t} roleKey={roleKey} userId={userId} permissions={permissions} />
          </td>
        </tr>
      )}
    </>
  );
}
