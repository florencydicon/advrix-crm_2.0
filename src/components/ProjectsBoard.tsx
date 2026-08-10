"use client";

import { useState, useTransition, useMemo, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Users, ChevronRight, FolderKanban, Search, XCircle } from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  assignProjectTeamAction,
} from "@/lib/actions/projects";
import type { PipelineClient, PipelineProject } from "@/lib/data";
import type { UserRow } from "@/lib/types";
import { ProjectStatusBadge, StatusBadge, PlatformBadges } from "@/components/ui";
import { TaskActions, TaskDetails } from "@/components/TaskWorkflow";
import QuickAssignFullTeam from "@/components/QuickAssignFullTeam";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "in_progress", label: "In Production" },
  { key: "pending_approval", label: "Awaiting Approval" },
  { key: "completed", label: "Completed" },
];

export default function ProjectsBoard({
  pipeline,
  team,
  roleKey,
  userId,
  initialClientId,
}: {
  pipeline: PipelineClient[];
  team: UserRow[];
  roleKey: string;
  userId: string;
  initialClientId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [openClient, setOpenClient] = useState<string | null>(initialClientId || null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (initialClientId) setOpenClient(initialClientId);
  }, [initialClientId]);

  const canManage = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const canDelete = roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  const activeClientName =
    pipeline.find((c) => c.client_id === initialClientId)?.client_name || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const termMatch = (s: string) => !q || (s || "").toLowerCase().includes(q);

    return pipeline
      .filter((c) => !initialClientId || c.client_id === initialClientId)
      .map((c) => {
        const projects = c.projects
          .filter((p) => !statusFilter || p.status === statusFilter)
          .filter((p) => {
            if (!q) return true;
            if (termMatch(c.client_name) || termMatch(p.name)) return true;
            return p.tasks.some((t) => termMatch(t.title) || termMatch(t.assignee_name || ""));
          })
          .map((p) => {
            const tasks = q
              ? p.tasks.filter(
                  (t) =>
                    termMatch(t.title) ||
                    termMatch(t.assignee_name || "") ||
                    termMatch(c.client_name) ||
                    termMatch(p.name)
                )
              : p.tasks;
            return {
              ...p,
              tasks,
              total_tasks: tasks.length,
              completed_tasks: tasks.filter((t) => t.status === "completed").length,
            };
          });
        return { ...c, projects };
      })
      .filter((c) => c.projects.length > 0);
  }, [pipeline, query, statusFilter, initialClientId]);

  const totalProjects = filtered.reduce((n, c) => n + c.projects.length, 0);
  const totalActive = filtered.reduce(
    (n, c) => n + c.projects.filter((p) => p.status === "in_progress").length,
    0
  );

  const tabCounts = STATUS_TABS.map((tab) => ({
    ...tab,
    count: tab.key === "" ? pipeline.length : pipeline.reduce((n, c) => n + c.projects.filter((p) => p.status === tab.key).length, 0),
  }));

  if (pipeline.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-10 text-center">
        <FolderKanban className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-600">No projects yet</p>
        <p className="text-xs text-slate-400 mt-1">Sales briefs will land here for approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Project Pipeline</h1>
          <p className="text-sm text-slate-500">From brief to delivery — grouped by client.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-slate-100 text-slate-600">{totalProjects} projects</span>
          <span className="badge bg-brand-100 text-brand-700">{totalActive} in production</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, projects, tasks, assignees…"
            className="input !pl-8 !py-1.5 text-xs"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tabCounts.map((tab) => (
            <button
              key={tab.key || "all"}
              onClick={() => setStatusFilter(statusFilter === tab.key ? "" : tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === tab.key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-600"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === tab.key ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
          {initialClientId && activeClientName && (
            <button
              onClick={() => router.push("/projects")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors"
            >
              <FolderKanban className="h-3 w-3" />
              {activeClientName}
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card py-8 text-center text-xs text-slate-400">
            No projects match your filters.
            {initialClientId && (
              <div className="mt-2">
                <button onClick={() => router.push("/projects")} className="btn-secondary !py-1 text-[11px]">
                  Clear client filter
                </button>
              </div>
            )}
          </div>
        )}
        {filtered.map((client) => {
          const clientOpen = openClient === client.client_id;
          const clientTotalTasks = client.projects.reduce((n, p) => n + p.total_tasks, 0);
          const clientDone = client.projects.reduce((n, p) => n + p.completed_tasks, 0);

          return (
            <div key={client.client_id} className="card overflow-hidden">
              {/* Client row */}
              <button
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors text-left"
                onClick={() => { setOpenClient(clientOpen ? null : client.client_id); setOpenProject(null); setOpenTaskId(null); }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-slate-400 transition-transform ${clientOpen ? "rotate-90" : ""}`}>
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{client.client_name}</p>
                    <p className="text-[11px] text-slate-400">{client.projects.length} project{client.projects.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge bg-emerald-100 text-emerald-700">{clientDone}/{clientTotalTasks} done</span>
                </div>
              </button>

              {clientOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {client.projects.map((p) => {
                    const projectOpen = openProject === p.id;
                    const inProgress = p.status === "in_progress";
                    return (
                      <div key={p.id}>
                        {/* Project row */}
                        <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/40 transition-colors">
                          <button
                            className="flex items-center gap-3 text-left flex-1 min-w-0"
                            onClick={() => setOpenProject(projectOpen ? null : p.id)}
                          >
                            <span className={`text-slate-300 transition-transform ${projectOpen ? "rotate-90" : ""}`}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium text-xs text-slate-800 truncate">{p.name}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                <ProjectStatusBadge status={p.status} />
                                <span className="text-[11px] text-slate-400">
                                  {p.deadline ? `Due ${new Date(p.deadline).toLocaleDateString()}` : "No deadline"}
                                </span>
                                {p.total_tasks > 0 && (
                                  <span className="text-[11px] text-slate-500">
                                    {p.completed_tasks}/{p.total_tasks} tasks
                                  </span>
                                )}
                              </div>
                              {p.assignments.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  <Users className="h-3 w-3 text-slate-300" />
                                  {p.assignments.map((a) => (
                                    <span key={a.id} className="badge bg-slate-100 text-slate-500">
                                      {a.role_label}: {a.user_name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            {canManage && p.status === "pending_approval" && (
                              <>
                                <button
                                  className="btn-primary !py-1 !px-2 text-[11px]"
                                  disabled={pending}
                                  onClick={() => run(() => approveProjectAction(p.id))}
                                >
                                  <Check className="h-3 w-3" /> Approve
                                </button>
                                <button
                                  className="btn-ghost !text-rose-600 !py-1 !px-1.5 text-[11px]"
                                  disabled={pending}
                                  onClick={() => run(() => rejectProjectAction(p.id))}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </>
                            )}
                            {canManage && inProgress && (
                              <button
                                className={`btn-secondary !py-1 !px-2 text-[11px] ${projectOpen ? "bg-brand-100 text-brand-700" : ""}`}
                                onClick={() => setOpenProject(projectOpen ? null : p.id)}
                              >
                                <Users className="h-3 w-3" /> Team
                              </button>
                            )}
                            {canDelete && (
                              <button
                                className="btn-ghost !text-rose-600 !py-1 !px-1.5 text-[11px]"
                                onClick={() => {
                                  if (confirm(`Delete "${p.name}"?`)) run(() => deleteProjectAction(p.id));
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Project drill-down: team allocation + tasks */}
                        {projectOpen && (
                          <div className="px-4 pb-3 space-y-3 bg-slate-50/30">
                            {canManage && inProgress && (
                              <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <QuickAssignFullTeam
                                  project={p as unknown as Parameters<typeof QuickAssignFullTeam>[0]["project"]}
                                  team={team}
                                  onAssignAll={(assignments) => run(() => assignProjectTeamAction(p.id, assignments))}
                                  pending={pending}
                                />
                              </div>
                            )}

                            {p.tasks.length === 0 ? (
                              <p className="text-xs text-slate-400 py-3">No tasks yet.</p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/60">
                                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Task</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-[90px]">Role</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-[100px]">Assignee</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-[110px]">Status</th>
                                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider w-[120px]">Published</th>
                                      <th className="px-3 py-2 w-[160px]"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {p.tasks.map((t) => {
                                      const open = openTaskId === t.id;
                                      return (
                                        <Fragment key={t.id}>
                                          <tr
                                            className={`cursor-pointer transition-colors align-top ${open ? "bg-brand-50/30" : "hover:bg-slate-50/50"}`}
                                            onClick={() => setOpenTaskId(open ? null : t.id)}
                                          >
                                            <td className="px-3 py-2">
                                              <div className="flex items-start gap-1.5">
                                                <span className={`text-slate-300 transition-transform mt-0.5 ${open ? "rotate-90" : ""}`}>
                                                  <ChevronRight className="h-3 w-3" />
                                                </span>
                                                <div className="min-w-0">
                                                  <p className="font-medium text-slate-800">{t.title}</p>
                                                  {t.description && (
                                                    <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                                                  )}
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-3 py-2">
                                              {t.role_label && <span className="badge bg-slate-100 text-slate-500">{t.role_label}</span>}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">{t.assignee_name || "—"}</td>
                                            <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                                            <td className="px-3 py-2"><PlatformBadges platforms={t.platforms} /></td>
                                            <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                              <TaskActions
                                                task={t}
                                                roleKey={roleKey}
                                                userId={userId}
                                                onExpand={(id) => setOpenTaskId(openTaskId === id ? null : id)}
                                              />
                                            </td>
                                          </tr>
                                          {open && (
                                            <tr className="bg-slate-50/40">
                                              <td colSpan={6} className="px-3 py-2">
                                                <TaskDetails task={t} roleKey={roleKey} userId={userId} />
                                              </td>
                                            </tr>
                                          )}
                                        </Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}