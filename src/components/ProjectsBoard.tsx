"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check, X, Trash2, CalendarClock, Users } from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  updateTaskStatusAction,
  setTaskAssigneeAction,
  assignProjectTeamAction,
  extendDeadlineAction,
} from "@/lib/actions/projects";
import type { ProjectDetail, UserRow } from "@/lib/types";
import { ProjectStatusBadge, StatusBadge, EmptyState } from "@/components/ui";

export default function ProjectsBoard({
  projects,
  team,
  roleKey,
}: {
  projects: ProjectDetail[];
  team: UserRow[];
  roleKey: string;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [editingDeadline, setEditingDeadline] = useState<string | null>(null);
  const [allocDraft, setAllocDraft] = useState<Record<string, Record<string, string>>>({});

  const canManage = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const canDelete = roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  function saveAllocations(p: ProjectDetail) {
    const roles = [...new Set(p.groups.flatMap((g) => g.tasks.map((t) => t.role_key)))];
    const allocations = roles.map((r) => ({
      role_key: r,
      user_id: allocDraft[p.id]?.[r] || null,
    }));
    run(() => assignProjectTeamAction(p.id, allocations));
  }

  if (projects.length === 0) {
    return <EmptyState title="No projects yet" subtitle="Sales briefs will land here for approval." />;
  }

  return (
    <div className="space-y-4">
      {projects.map((p) => {
        const open = openId === p.id;
        const roles = [...new Set(p.groups.flatMap((g) => g.tasks.map((t) => t.role_key)))];
        const draft = allocDraft[p.id] || {};
        const existingAlloc: Record<string, string> = {};
        for (const a of p.assignments) existingAlloc[a.role_key] = a.user_id;

        return (
          <div key={p.id} className="card overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/70 transition-colors"
              onClick={() => setOpenId(open ? null : p.id)}
            >
              <div className={`transition-transform ${open ? "rotate-180" : ""}`}>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {p.client_name} · {p.deadline ? `due ${new Date(p.deadline).toLocaleDateString()}` : "no deadline"}
                </p>
              </div>
              <ProjectStatusBadge status={p.status} />
            </button>

            {open && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                {p.brief && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Brief</p>
                    <p className="text-sm text-slate-600 mt-1">{p.brief}</p>
                  </div>
                )}
                {p.deliverables && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Deliverables</p>
                    <p className="text-sm text-slate-600 mt-1">{p.deliverables}</p>
                  </div>
                )}

                {p.status === "pending_approval" && canManage && (
                  <div className="flex items-center gap-3 pt-2">
                    <button className="btn-primary" disabled={pending} onClick={() => run(() => approveProjectAction(p.id))}>
                      <Check className="h-4 w-4" /> Approve &amp; Generate Tasks
                    </button>
                    <button className="btn-danger" disabled={pending} onClick={() => run(() => rejectProjectAction(p.id))}>
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}

                {canManage && p.status === "in_progress" && roles.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-brand-700" />
                      <p className="text-sm font-semibold text-slate-700">Team Allocation</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      Assign one member per role. The same member may hold multiple roles on this project — tasks are auto-assigned.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {roles.map((r) => (
                        <div key={r}>
                          <label className="label">{r.replace(/_/g, " ").toLowerCase()}</label>
                          <select
                            className="input !py-1.5 text-sm"
                            value={draft[r] !== undefined ? draft[r] : (existingAlloc[r] || "")}
                            onChange={(e) =>
                              setAllocDraft((prev) => ({
                                ...prev,
                                [p.id]: { ...(prev[p.id] || {}), [r]: e.target.value },
                              }))
                            }
                          >
                            <option value="">Unassigned</option>
                            {team.map((u) => (
                              <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn-primary !py-1.5 text-xs"
                      disabled={pending}
                      onClick={() => saveAllocations(p)}
                    >
                      Apply allocation &amp; auto-assign
                    </button>
                  </div>
                )}

                {canManage && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-slate-400" />
                      {editingDeadline === p.id ? (
                        <>
                          <input
                            type="date"
                            defaultValue={p.deadline || ""}
                            className="input !w-44 !py-1.5"
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v) run(() => extendDeadlineAction(p.id, v));
                              setEditingDeadline(null);
                            }}
                          />
                        </>
                      ) : (
                        <button className="text-sm text-brand-600 hover:underline" onClick={() => setEditingDeadline(p.id)}>
                          {p.deadline ? `Adjust deadline (${new Date(p.deadline).toLocaleDateString()})` : "Set deadline"}
                        </button>
                      )}
                    </div>
                    {canDelete && (
                      <button
                        className="btn-ghost !text-rose-600 ml-auto"
                        onClick={() => {
                          if (confirm(`Delete project "${p.name}" and all its tasks?`)) run(() => deleteProjectAction(p.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    )}
                  </div>
                )}

                {p.groups.length === 0 ? (
                  <p className="text-sm text-slate-400">No tasks yet — approve the brief to generate the deliverables pipeline.</p>
                ) : (
                  <div className="space-y-3">
                    {p.groups.map((g) => (
                      <div key={g.group_key} className={`rounded-xl border p-4 ${g.completed ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50/60 border-slate-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-700">{g.name}</p>
                          {g.completed && <StatusBadge status="completed" />}
                        </div>
                        <div className="space-y-2">
                          {g.tasks.map((t) => (
                            <div key={t.id} className="flex flex-wrap items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800">{t.title}</p>
                                <p className="text-xs text-slate-400">
                                  {t.role_label || t.role_key} · {t.assignee_name || "Unassigned"} · created {new Date(t.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <StatusBadge status={t.status} />
                              {canManage && (
                                <>
                                  <select
                                    className="input !w-36 !py-1 text-xs"
                                    value={t.assigned_to || ""}
                                    onChange={(e) => run(() => setTaskAssigneeAction(t.id, e.target.value))}
                                  >
                                    <option value="">Unassigned</option>
                                    {team.map((u) => (
                                      <option key={u.id} value={u.id}>{u.full_name}</option>
                                    ))}
                                  </select>
                                  {t.status !== "completed" && (
                                    <button
                                      className="btn-secondary !py-1 text-xs"
                                      onClick={() => run(() => updateTaskStatusAction(t.id, "completed"))}
                                    >
                                      <Check className="h-3.5 w-3.5" /> Complete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
