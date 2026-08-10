"use client";

import { useState, useMemo, Fragment } from "react";
import { ArrowRight, PlayCircle, Clock, CheckCircle2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { StatusBadge, PriorityBadge, PlatformBadges } from "@/components/ui";
import { TaskActions, TaskDetails } from "@/components/TaskWorkflow";
import type { Column } from "@/components/SmartTable";

interface GroupedClient {
  client_name: string;
  projects: { name: string; tasks: Task[] }[];
  tasks: Task[];
}

export default function StaffDashboard({ tasks, roleKey, userId }: { tasks: Task[]; roleKey: string; userId: string }) {
  const [search, setSearch] = useState("");
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const activeStatuses = ["in_progress", "submitted", "needs_improvement", "client_review", "client_feedback", "client_approved", "uploading"];

  const metrics = [
    { label: "Active", value: tasks.filter((t) => activeStatuses.includes(t.status)).length, Icon: PlayCircle, cls: "text-brand-600 bg-brand-50" },
    { label: "Pending", value: tasks.filter((t) => t.status === "pending").length, Icon: Clock, cls: "text-amber-600 bg-amber-50" },
    { label: "Done", value: tasks.filter((t) => t.status === "completed").length, Icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50" },
  ];

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.project_name.toLowerCase().includes(q) ||
        t.client_name.toLowerCase().includes(q)
    );
  }, [tasks, search]);

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
        <p className="text-sm font-medium text-slate-600">No assignments yet</p>
        <p className="text-xs text-slate-400 mt-1">New tasks will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className={`card flex items-center gap-3 px-4 py-3 ${m.cls}`}>
            <m.Icon className="h-5 w-5" />
            <div>
              <p className="text-2xl font-bold leading-none">{m.value}</p>
              <p className="text-[11px] font-medium mt-1 opacity-80">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks, projects, clients…" className="input !py-1.5 text-xs" />
        </div>
      </div>

      <div className="space-y-3">
        {grouped.length === 0 && (
          <div className="card py-8 text-center text-xs text-slate-400">No tasks match your search.</div>
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
                                  <TaskDetails task={t} roleKey={roleKey} userId={userId} />
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
