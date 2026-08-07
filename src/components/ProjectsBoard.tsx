"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Users, ChevronRight, FolderKanban } from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  assignProjectTeamAction,
} from "@/lib/actions/projects";
import type { PipelineClient, PipelineProject } from "@/lib/data";
import type { UserRow } from "@/lib/types";
import { ProjectStatusBadge, StatusBadge, PlatformBadges } from "@/components/ui";
import { TaskActions, ReviewPanel, ContentEditor } from "@/components/TaskWorkflow";
import QuickAssignFullTeam from "@/components/QuickAssignFullTeam";

export default function ProjectsBoard({
  pipeline,
  team,
  roleKey,
  userId,
}: {
  pipeline: PipelineClient[];
  team: UserRow[];
  roleKey: string;
  userId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [openClient, setOpenClient] = useState<string | null>(null);
  const [openProject, setOpenProject] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const canManage = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const canDelete = roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  const totalProjects = pipeline.reduce((n, c) => n + c.projects.length, 0);
  const totalActive = pipeline.reduce(
    (n, c) => n + c.projects.filter((p) => p.status === "in_progress").length,
    0
  );

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

      <div className="space-y-3">
        {pipeline.map((client) => {
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
                                      <th className="px-3 py-2 w-[180px]"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {p.tasks.map((t) => (
                                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors align-top">
                                        <td className="px-3 py-2">
                                          <button
                                            className="text-left"
                                            onClick={() => setOpenTaskId(openTaskId === t.id ? null : t.id)}
                                          >
                                            <p className="font-medium text-slate-800">{t.title}</p>
                                            {t.description && (
                                              <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                                            )}
                                          </button>
                                        </td>
                                        <td className="px-3 py-2">
                                          {t.role_label && <span className="badge bg-slate-100 text-slate-500">{t.role_label}</span>}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">{t.assignee_name || "—"}</td>
                                        <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                                        <td className="px-3 py-2"><PlatformBadges platforms={t.platforms} /></td>
                                        <td className="px-3 py-2">
                                          <TaskActions
                                            task={t}
                                            roleKey={roleKey}
                                            userId={userId}
                                            onExpand={(id) => setOpenTaskId(openTaskId === id ? null : id)}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {openTaskId && (() => {
                              const task = p.tasks.find((t) => t.id === openTaskId);
                              if (!task) return null;
                              return (
                                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                  <p className="text-xs font-semibold text-slate-700">{task.title}</p>
                                  <ContentEditor task={task} roleKey={roleKey} userId={userId} />
                                  {task.status === "submitted" && canManage && <ReviewPanel task={task} />}
                                  {task.review_comment && (
                                    <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-2 text-xs">
                                      <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Review note</p>
                                      <p className="text-slate-600 mt-0.5">{task.review_comment}</p>
                                    </div>
                                  )}
                                  {task.client_feedback && (
                                    <div className="rounded-lg border border-sky-100 bg-sky-50/60 p-2 text-xs">
                                      <p className="text-[10px] font-semibold text-sky-700 uppercase tracking-wide">Client feedback</p>
                                      <p className="text-slate-600 mt-0.5">{task.client_feedback}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
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
