"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Upload, CheckCircle2, Filter, ChevronDown, MoreVertical } from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { formatClientName } from "@/lib/utils";

function taskTypeLabel(groupKey: string | null): string {
  if (!groupKey || groupKey === "manual") return "Task";
  const map: Record<string, string> = {
    writer: "Content", designer: "Design", editor: "Editing",
    smm: "SMM", videographer: "Video",
  };
  const base = groupKey.split("_d_")[0].split("_v_")[0];
  return map[base] || "Task";
}
import TaskModal from "@/components/TaskModal";
import { hasPermission } from "@/lib/permissions";

const TABS = [
  { key: "", label: "All" },
  { key: "approved", label: "Ready to Start" },
  { key: "client_review", label: "Client Review" },
  { key: "uploading", label: "Uploading" },
  { key: "submitted", label: "Awaiting Review" },
  { key: "completed", label: "Completed" },
];

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

const COMPLETED_KEYS = ["completed", "upload_done"];

export default function SmmDashboard({
  tasks,
  team,
  userId,
  roleKey,
  permissions,
}: {
  tasks: Task[];
  team: UserRow[];
  userId: string;
  roleKey: string;
  permissions?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const isMobile = useIsMobile();
  const canManageTeam = hasPermission(permissions, "tasks:manage");
  const canApprove =
    canManageTeam || hasPermission(permissions, "tasks:review");

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

  const completed = (t: Task) => COMPLETED_KEYS.includes(t.status);

  const metrics = [
    { label: "Ready to Start", value: tasks.filter((t) => t.status === "approved").length, Icon: Users, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "Client Review", value: tasks.filter((t) => t.status === "client_review").length, Icon: Users, cls: "text-sky-300 bg-sky-400/10" },
    { label: "Uploading", value: tasks.filter((t) => t.status === "uploading").length, Icon: Upload, cls: "text-amber-300 bg-amber-400/10" },
    { label: "Completed", value: tasks.filter((t) => completed(t)).length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter) {
        if (statusFilter === "completed") {
          if (!completed(t)) return false;
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

  const tabCounts = TABS.map((tab) => ({
    ...tab,
    count: tab.key
      ? tab.key === "completed"
        ? tasks.filter((t) => completed(t)).length
        : tasks.filter((t) => t.status === tab.key).length
      : tasks.length,
  }));

  const refresh = async () => {
    router.refresh();
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
        <MoreVertical className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
          {taskTypeLabel(t.group_key)}
        </span>
        <StatusBadge status={t.status} />
        <PriorityBadge priority={t.priority} />
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
            <span>Filter: {TABS.find((f) => f.key === statusFilter)?.label || "All"}</span>
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
            {tasks.length === 0 ? "No SMM tasks yet" : "No tasks match your search."}
          </p>
          <p className="text-xs text-slate-500 mt-1">SMM tasks will appear here once projects are approved.</p>
        </div>
      ) : (
        <>
          {/* Desktop: unified clickable data table */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[880px]">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 border-b border-white/[0.06]">
                    <th className="px-4 py-2.5 min-w-[200px] sticky left-0 bg-night-850 z-20">Client</th>
                    <th className="px-3 py-2.5 min-w-[160px]">Project</th>
                    <th className="px-3 py-2.5 min-w-[200px]">Task</th>
                    <th className="px-3 py-2.5 min-w-[140px] whitespace-nowrap">Task Type</th>
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
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-2.5 sticky left-0 bg-night-850 z-[5]">
                        <span className="text-xs font-medium text-brand-300/90 block truncate max-w-[180px]">
                          {formatClientName(t.client_company, t.client_name)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-slate-300 truncate block max-w-[140px]">{t.project_name}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="text-sm text-white font-medium leading-tight truncate max-w-[180px]">{t.title}</p>
                      </td>
                      <td className="px-3 py-2.5">
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
                        <span className="text-xs tabular-nums text-slate-400">
                          {t.due_date ? t.due_date.slice(0, 10) : "—"}
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