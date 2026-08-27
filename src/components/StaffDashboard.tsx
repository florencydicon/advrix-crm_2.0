"use client";

import { useState, useMemo, Fragment } from "react";
import { ArrowRight, PlayCircle, Clock, CheckCircle2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge, PlatformBadges } from "@/components/ui";
import { TaskActions, TaskDetails } from "@/components/TaskWorkflow";
import type { Column } from "@/components/SmartTable";

interface GroupedClient {
  client_name: string;
  client_company: string | null;
  projects: { name: string; tasks: Task[] }[];
  tasks: Task[];
}

export default function StaffDashboard({ tasks, roleKey, userId }: { tasks: Task[]; roleKey: string; userId: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const activeStatuses = ["in_progress", "submitted", "needs_improvement", "client_review", "client_feedback", "client_approved", "uploading"];

  const FILTERS = [
    { key: "", label: "All" },
    { key: "in_progress", label: "Active" },
    { key: "pending", label: "Pending" },
    { key: "submitted", label: "Awaiting Review" },
    { key: "needs_improvement", label: "Improvement Needed" },
    { key: "completed", label: "Done" },
  ];

  const metrics = [
    { label: "Active", value: tasks.filter((t) => activeStatuses.includes(t.status)).length, Icon: PlayCircle, cls: "text-brand-300 bg-brand-300/[0.07]" },
    { label: "Pending", value: tasks.filter((t) => t.status === "pending").length, Icon: Clock, cls: "text-amber-300 bg-amber-400/10" },
    { label: "Done", value: tasks.filter((t) => t.status === "completed").length, Icon: CheckCircle2, cls: "text-emerald-300 bg-emerald-400/10" },
  ];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.project_name.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q) ||
        (t.client_company || "").toLowerCase().includes(q)
      );
    });
  }, [tasks, search, statusFilter]);

  const tabCounts = FILTERS.map((f) => ({
    ...f,
    count: f.key ? tasks.filter((t) => t.status === f.key).length : tasks.length,
  }));

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedClient>();
    for (const t of filtered) {
      const key = t.client_company || t.client_name;
      if (!map.has(key)) {
        map.set(key, { client_name: t.client_name, client_company: t.client_company, projects: [], tasks: [] });
      }
      const client = map.get(key)!;
      client.tasks.push(t);
    }
    for (const client of map.values()) {
      const projectMap = new Map<string, GroupedClient["projects"][number]>();
      for (const t of client.tasks) {
        if (!projectMap.has(t.project_name)) {
          projectMap.set(t.project_name, { name: t.project_name, tasks: [] });
        }
        projectMap.get(t.project_name)!.tasks.push(t);
      }
      client.projects = [...projectMap.values()];
    }
    return [...map.values()];
  }, [filtered]);

  const columns: Column<Task>[] = [
    {
      key: "task",
      label: "Task",
      render: (t) => (
        <div>
          <p className="font-medium text-xs text-white">{t.title}</p>
          <p className="text-[11px] text-slate-500">{t.project_name} · {t.client_company || t.client_name}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      className: "w-[80px]",
      render: (t) => t.role_label ? <span className="badge bg-white/10 text-slate-400">{t.role_label}</span> : null,
    },
    {
      key: "priority",
      label: "Priority",
      className: "w-[70px]",
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: "status",
      label: "Status",
      className: "w-[110px]",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: "platforms",
      label: "Published on",
      className: "w-[130px]",
      render: (t) => <PlatformBadges platforms={t.platforms} />,
    },
    {
      key: "action",
      label: "",
      render: (t) => (
        <TaskActions
          task={t}
          roleKey={roleKey}
          userId={userId}
          onExpand={(id) => setOpenTaskId(openTaskId === id ? null : id)}
        />
      ),
    },
  ];

  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm font-medium text-slate-300">No assignments yet</p>
        <p className="text-xs text-slate-500 mt-1">New tasks will appear here automatically.</p>
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
              <p className="text-[10px] md:text-[11px] font-medium mt-1 opacity-80">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, projects, clients…" className="input !py-1.5 text-xs" />
          </div>
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
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === tab.key ? "bg-brand-300/20 text-brand-300" : "bg-white/10 text-slate-400"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {grouped.length === 0 && (
          <div className="card py-8 text-center text-xs text-slate-500">No tasks match your search.</div>
        )}
        {grouped.map((client) => {
          const key = client.client_company || client.client_name;
          const isOpen = openClient === key;
          const done = client.tasks.filter((t) => t.status === "completed").length;
          const active = client.tasks.filter((t) => t.status !== "completed").length;
          return (
            <div key={key} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
                onClick={() => { setOpenClient(isOpen ? null : key); setOpenTaskId(null); }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{client.client_company || client.client_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{client.client_company ? client.client_name : `${client.projects.length} project${client.projects.length === 1 ? "" : "s"}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="badge bg-emerald-400/10 text-emerald-300 text-[10px] md:text-xs">{done} done</span>
                  <span className={`badge text-[10px] md:text-xs ${active > 0 ? "bg-amber-400/10 text-amber-300" : "bg-white/10 text-slate-400"}`}>{active} active</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.06]">
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.03]">
                          {columns.map((col) => (
                            <th key={col.key} className={`px-4 py-2 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${col.className || ""}`}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {client.tasks.map((t) => (
                          <Fragment key={t.id}>
                            <tr className="hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}>
                              {columns.map((col) => (
                                <td key={col.key} className={`px-4 py-2 ${col.className || ""}`} onClick={(e) => e.stopPropagation()}>
                                  {col.render(t)}
                                </td>
                              ))}
                            </tr>
                            {openTaskId === t.id && (
                              <tr className="bg-white/[0.03]">
                                <td colSpan={columns.length} className="px-4 py-2">
                                  <TaskDetails task={t} roleKey={roleKey} userId={userId} />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-white/[0.06]">
                    {client.tasks.map((t) => (
                      <div key={t.id}>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                          onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs text-white truncate">{t.title}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {t.role_label && <span className="badge bg-white/10 text-slate-400 text-[10px]">{t.role_label}</span>}
                              <PriorityBadge priority={t.priority} />
                              <StatusBadge status={t.status} />
                            </div>
                          </div>
                          <span className={`text-slate-500 transition-transform shrink-0 ${openTaskId === t.id ? "rotate-90" : ""}`}>
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </button>
                        {openTaskId === t.id && (
                          <div className="px-4 pb-3 pt-2 border-t border-white/[0.04] bg-white/[0.02]">
                            <TaskDetails task={t} roleKey={roleKey} userId={userId} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
