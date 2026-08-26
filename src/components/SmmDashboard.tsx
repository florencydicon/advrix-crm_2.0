"use client";

import { useState, useMemo } from "react";
import { ChevronRight, Search, Users, Upload, CheckCircle2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge, PlatformBadges } from "@/components/ui";
import {
  TaskDetails,
  ClientFeedbackPanel,
  PublishPanel,
} from "@/components/TaskWorkflow";

const TABS = [
  { key: "", label: "All" },
  { key: "client_review", label: "Client Review" },
  { key: "uploading", label: "Uploading" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
];

export default function SmmDashboard({
  tasks,
  userId,
}: {
  tasks: Task[];
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const metrics = [
    { label: "Client Review", value: tasks.filter((t) => t.status === "client_review").length, Icon: Users, cls: "text-sky-300 bg-sky-400/10" },
    { label: "Uploading", value: tasks.filter((t) => t.status === "uploading").length, Icon: Upload, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "Completed", value: tasks.filter((t) => t.status === "completed").length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
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
      ? tasks.filter((t) => t.status === tab.key).length
      : tasks.length,
  }));

  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm font-medium text-slate-300">No tasks assigned yet</p>
        <p className="text-xs text-slate-500 mt-1">SMM tasks will appear here once projects are approved.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 md:gap-3">
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

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="card py-8 text-center text-xs text-slate-500">
            No tasks match your filters.
          </div>
        )}
        {filtered.map((t) => {
          const open = openId === t.id;
          return (
            <div key={t.id} className={`card overflow-hidden transition-colors ${open ? "ring-1 ring-brand-300/30" : ""}`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                onClick={() => setOpenId(open ? null : t.id)}
              >
                <span className={`text-slate-300 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}>
                  <ChevronRight className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs text-white truncate">{t.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {t.client_company || t.client_name} · {t.project_name}
                    {t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="hidden sm:block shrink-0">
                  <PlatformBadges platforms={t.platforms} />
                </div>
                <StatusBadge status={t.status} />
              </button>
              {open && (
                <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] space-y-3">
                  {t.status === "client_review" && <ClientFeedbackPanel task={t} />}
                  {t.status === "uploading" && <PublishPanel task={t} />}
                  {t.status !== "client_review" && t.status !== "uploading" && (
                    <TaskDetails task={t} roleKey="SMM" userId={userId} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}