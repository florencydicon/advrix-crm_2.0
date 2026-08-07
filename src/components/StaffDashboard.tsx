"use client";

import { useState, useMemo, Fragment } from "react";
import { ArrowRight } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge, PlatformBadges } from "@/components/ui";
import { ContentEditor, TaskActions } from "@/components/TaskWorkflow";
import type { Column } from "@/components/SmartTable";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Awaiting Review" },
  { key: "needs_improvement", label: "Needs Work" },
  { key: "client_review", label: "Client Review" },
  { key: "client_feedback", label: "Client Feedback" },
  { key: "client_approved", label: "Approved" },
  { key: "uploading", label: "Uploading" },
  { key: "completed", label: "Completed" },
];

interface GroupedClient {
  client_name: string;
  projects: { name: string; tasks: Task[] }[];
  tasks: Task[];
}

export default function StaffDashboard({ tasks, roleKey, userId }: { tasks: Task[]; roleKey: string; userId: string }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.project_name.toLowerCase().includes(q) || t.client_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, statusFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedClient>();
    for (const t of filtered) {
      if (!map.has(t.client_name)) {
        map.set(t.client_name, { client_name: t.client_name, projects: [], tasks: [] });
      }
      const client = map.get(t.client_name)!;
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

  const counts = STATUS_FILTERS.map((f) => ({
    ...f,
    count: f.key === "" ? tasks.length : tasks.filter((t) => t.status === f.key).length,
  }));

  const columns: Column<Task>[] = [
    {
      key: "task",
      label: "Task",
      render: (t) => (
        <div>
          <p className="font-medium text-xs text-slate-800">{t.title}</p>
          <p className="text-[11px] text-slate-400">{t.project_name} · {t.client_name}</p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      className: "w-[80px]",
      render: (t) => t.role_label ? <span className="badge bg-slate-100 text-slate-500">{t.role_label}</span> : null,
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
      render: (t) => <TaskActions task={t} roleKey={roleKey} userId={userId} />,
    },
  ];

  if (tasks.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm font-medium text-slate-600">No assignments yet</p>
        <p className="text-xs text-slate-400 mt-1">New tasks will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, projects, clients…" className="input !py-1.5 text-xs" />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {counts.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key === statusFilter ? "" : f.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                statusFilter === f.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label} <span className="opacity-70">({f.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {grouped.length === 0 && (
          <div className="card py-8 text-center text-xs text-slate-400">No tasks match your filter.</div>
        )}
        {grouped.map((client) => {
          const isOpen = openClient === client.client_name;
          const done = client.tasks.filter((t) => t.status === "completed").length;
          const active = client.tasks.filter((t) => t.status !== "completed").length;
          return (
            <div key={client.client_name} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors text-left"
                onClick={() => { setOpenClient(isOpen ? null : client.client_name); setOpenTaskId(null); }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{client.client_name}</p>
                    <p className="text-[11px] text-slate-400">{client.projects.length} project{client.projects.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-emerald-100 text-emerald-700">{done} done</span>
                  <span className={`badge ${active > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{active} active</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/60">
                          {columns.map((col) => (
                            <th key={col.key} className={`px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${col.className || ""}`}>
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {client.tasks.map((t) => (
                          <Fragment key={t.id}>
                            <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}>
                              {columns.map((col) => (
                                <td key={col.key} className={`px-4 py-2 ${col.className || ""}`} onClick={(e) => e.stopPropagation()}>
                                  {col.render(t)}
                                </td>
                              ))}
                            </tr>
                            {openTaskId === t.id && (
                              <tr className="bg-slate-50/30">
                                <td colSpan={columns.length} className="px-4 py-2">
                                  <ContentEditor task={t} roleKey={roleKey} />
                                  {t.review_comment && (
                                    <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/60 p-2 text-xs">
                                      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Review note</p>
                                      <p className="text-slate-600 mt-0.5">{t.review_comment}</p>
                                    </div>
                                  )}
                                  {t.client_feedback && (
                                    <div className="mt-2 rounded-lg border border-sky-100 bg-sky-50/60 p-2 text-xs">
                                      <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wide">Client feedback</p>
                                      <p className="text-slate-600 mt-0.5">{t.client_feedback}</p>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
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
