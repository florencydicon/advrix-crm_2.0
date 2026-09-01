"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, Users, Upload, CheckCircle2 } from "lucide-react";
import type { Task, UserRow } from "@/lib/types";
import { StatusBadge, PlatformBadges } from "@/components/ui";
import { formatClientName } from "@/lib/utils";
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const isMobile = useIsMobile();
  const canManageTeam = hasPermission(permissions, "tasks:manage");
  const canApprove =
    canManageTeam || hasPermission(permissions, "tasks:review");

  const metrics = [
    { label: "Ready to Start", value: tasks.filter((t) => t.status === "approved").length, Icon: Users, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "Client Review", value: tasks.filter((t) => t.status === "client_review").length, Icon: Users, cls: "text-sky-300 bg-sky-400/10" },
    { label: "Uploading", value: tasks.filter((t) => t.status === "uploading").length, Icon: Upload, cls: "text-amber-300 bg-amber-400/10" },
    { label: "Completed", value: tasks.filter((t) => t.status === "completed" || t.status === "upload_done").length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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
        t.client_name.toLowerCase().includes(q)
      );
    });
  }, [tasks, query, statusFilter]);

  const tabCounts = TABS.map((tab) => ({
    ...tab,
    count: tab.key
      ? tab.key === "completed"
        ? tasks.filter((t) => t.status === "completed" || t.status === "upload_done").length
        : tasks.filter((t) => t.status === tab.key).length
      : tasks.length,
  }));

  const refresh = async () => {
    router.refresh();
  };

  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm font-medium text-slate-300">No tasks assigned yet</p>
        <p className="text-xs text-slate-500 mt-1">SMM tasks will appear here once projects are approved.</p>
      </div>
    );
  }

  const card = (t: Task) => (
    <button
      key={t.id}
      type="button"
      onClick={() => setOpenTask(t)}
      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] p-3.5 hover:bg-white/[0.05] transition-colors active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{t.title}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {formatClientName(t.client_company, t.client_name)} · {t.project_name}
            {t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString()}` : ""}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        <PlatformBadges platforms={t.platforms} />
        <span className="ml-auto">
          <StatusBadge status={t.status} />
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

      <div className="space-y-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, clients…"
            className="input !pl-8 !py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
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
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === tab.key ? "bg-brand-300/20 text-brand-300" : "bg-white/10 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="card py-8 text-center text-xs text-slate-500">
            No tasks match your filters.
          </div>
        )}
        {filtered.map((t) => card(t))}
      </div>

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
