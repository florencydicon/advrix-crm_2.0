"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Trash2, Users, CalendarDays, Coffee, ChevronDown, ChevronRight } from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  assignProjectTeamAction,
  updateTaskDueDateAction,
  removeTaskAssigneeAction,
  updateTaskRemarksAction,
  extendPersonDeadlineAction,
  updateTaskStatusAction,
} from "@/lib/actions/projects";
import type { PipelineClient } from "@/lib/data";
import type { Assignment, UserRow } from "@/lib/types";
import { StatusBadge, PlatformBadges } from "@/components/ui";
import { TaskActions, TaskDetails } from "@/components/TaskWorkflow";
import KanbanBoard from "@/components/KanbanBoard";
import type { TaskStatus } from "@/lib/types";
import { DatePicker } from "@/components/DatePicker";
import { Modal } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { DynamicTeamAllotment } from "@/components/DynamicTeamAllotment";
import { TaskBriefManager, TaskSequenceEditor, DeliverableSequenceEditor } from "@/components/TaskSequenceEditor";
import { ApproveAllButton } from "@/components/AiButtons";
import { RichTextEditor } from "@/components/RichText";

function isoDate(v: string | Date | null | undefined): string {
  if (!v) return "";
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}
const ROLE_TINTS: Record<string, string> = {
  WRITER: "bg-amber-400/10 text-amber-300",
  DESIGNER: "bg-pink-400/10 text-pink-300",
  EDITOR: "bg-cyan-400/10 text-cyan-300",
  SMM: "bg-indigo-400/10 text-indigo-300",
  VIDEOGRAPHER: "bg-violet-400/10 text-violet-300",
  PROJECT_MANAGER: "bg-violet-400/10 text-violet-300",
  SUPER_ADMIN: "bg-brand-300/10 text-brand-300",
};
function fmtDate(d: string | Date | null | undefined) {
  const iso = isoDate(d);
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
function extendIso(baseIso: string, days: number): string {
  const d = new Date(`${baseIso || isoDate(new Date())}T00:00:00`);
  let left = days;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) left--;
  }
  return isoDate(d);
}

export default function ProjectDetailView({
  client,
  team,
  roleKey,
  permissions,
  userId,
  highlightProject,
  highlightTask,
}: {
  client: PipelineClient;
  team: UserRow[];
  roleKey: string;
  permissions?: string[];
  userId: string;
  highlightProject?: string | null;
  highlightTask?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [extendTarget, setExtendTarget] = useState<{ projectId: string; assignment: Assignment } | null>(null);
  const [boardMode, setBoardMode] = useState<Record<string, boolean>>({});
  const [boardOpenId, setBoardOpenId] = useState<string | null>(null);

  // Deep-link: auto-expand project + task and scroll to it.
  useEffect(() => {
    if (!highlightProject) return;
    // Validate the project ID exists in our data.
    const targetProject = client.projects.find((p) => p.id === highlightProject);
    if (!targetProject) {
      window.history.replaceState(null, "", `/projects/${client.client_id}`);
      return;
    }
    setExpandedProjectId(highlightProject);
    if (!highlightTask) {
      window.history.replaceState(null, "", `/projects/${client.client_id}`);
      return;
    }
    // Find and expand the target task.
    const task = targetProject.tasks.find((t) => t.step_key === highlightTask);
    if (task) {
      setExpandedTaskId(task.id);
      requestAnimationFrame(() => {
        const el = document.getElementById(`task-${task.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("animate-highlight");
          setTimeout(() => {
            el.classList.remove("animate-highlight");
          }, 3200);
        }
      });
    }
    window.history.replaceState(null, "", `/projects/${client.client_id}`);
  }, [highlightProject, highlightTask, client]);

  const has = (key: string) => (permissions || []).includes("admin:*") || (permissions || []).includes(key);
  const canManage = has("projects:manage") || roleKey === "SUPER_ADMIN" || roleKey === "PROJECT_MANAGER";
  const canDelete = has("projects:delete") || roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e: any) {
        if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
        toast("Something went wrong. Please try again.", "error");
      }
    });
  }

  /** Kanban drag-to-move. Surfacing the action's error message (e.g. workflow transition rules). */
  function moveCard(taskId: string, status: TaskStatus) {
    start(async () => {
      const res = await updateTaskStatusAction(taskId, status);
      if (res.error) toast(res.error, "error");
      else toast(`Moved to "${status.replace(/_/g, " ")}"`, "success");
      router.refresh();
    });
  }

  const totalTasks = client.projects.reduce((n, p) => n + p.total_tasks, 0);
  const doneTasks = client.projects.reduce((n, p) => n + p.completed_tasks, 0);
  const activeProjects = client.projects.filter((p) => p.status === "in_progress").length;
  const pendingProjects = client.projects.filter((p) => p.status === "pending_approval").length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href="/projects" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-brand-300 transition-colors mb-0.5">
            <ArrowLeft className="h-3 w-3" /> All clients
          </Link>
          <h1 className="text-base font-bold tracking-tight leading-tight">{client.client_company || client.client_name}</h1>
          {client.client_company && <p className="text-[11px] text-slate-500 truncate">{client.client_name}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
            <span><span className="font-semibold text-white">{client.projects.length}</span> project{client.projects.length === 1 ? "" : "s"}</span>
            <span><span className="font-semibold text-brand-300">{activeProjects}</span> in prod.</span>
            {pendingProjects > 0 && <span><span className="font-semibold text-amber-300">{pendingProjects}</span> pending</span>}
            <span><span className="font-semibold text-emerald-300">{doneTasks}</span>/{totalTasks} done</span>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {client.projects.map((p) => {
          const isProjectOpen = expandedProjectId === p.id;
          const projectTeamOptions = Array.from(
            new Map(p.assignments.map((a) => [a.user_id, a])).values()
          ).map((a) => ({ id: a.user_id, name: a.user_name || "", role_label: a.role_label }));
          return (
            <div key={p.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedProjectId(isProjectOpen ? null : p.id)}
                className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-white truncate leading-tight">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(p.deadline)}</span>
                    <span>{p.completed_tasks}/{p.total_tasks} tasks</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {canManage && p.status === "pending_approval" && (
                    <>
                      <button className="btn-primary !py-1 !px-2 text-[10px]" disabled={pending} onClick={() => run(() => approveProjectAction(p.id))}>
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button className="btn-ghost !text-rose-400 !py-1 !px-1.5 text-[10px]" disabled={pending} onClick={() => run(() => rejectProjectAction(p.id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button className="btn-ghost !text-rose-400 !py-1 !px-1 text-[10px]" disabled={pending} onClick={() => { if (confirm(`Delete "${p.name}"?`)) run(() => deleteProjectAction(p.id)); }}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                  <span className="ml-1 text-slate-500">{isProjectOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
                </div>
              </button>

              {isProjectOpen && (
                <div className="animate-slide-down border-t border-white/[0.06]">

                  {canManage && p.status === "in_progress" && (
                    <div className="px-3 pt-2.5 space-y-1.5">
                      {(() => {
                        const pendingCount = p.tasks.filter((t) => t.step_key?.includes("_d_") && (t.status === "pending_approval" || t.status === "rejected")).length;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <ApproveAllButton projectId={p.id} pendingCount={pendingCount} />
                          </div>
                        );
                      })()}
                      {p.deliverables_list.map((d) => {
                        const dTasks = p.tasks.filter((t) => t.deliverable_id === d.id);
                        if (dTasks.length === 0) return null;
                        return (
                          <DeliverableSequenceEditor
                            key={d.id}
                            deliverableId={d.id}
                            label={d.category_label}
                            current={(d.assignees || []).map((a) => a.id)}
                            taskCount={dTasks.length}
                            available={projectTeamOptions}
                          />
                        );
                      })}
                      <DynamicTeamAllotment
                        key={p.id}
                        project={p as unknown as Parameters<typeof DynamicTeamAllotment>[0]["project"]}
                        team={team}
                        initial={p.assignments.map((a) => ({ role_key: a.role_key, user_id: a.user_id, deadline: a.allotment_deadline }))}
                        onSave={(filled) =>
                          run(() =>
                            assignProjectTeamAction(
                              p.id,
                              filled.map((r) => ({ role_key: r.role_key, user_id: r.user_id!, deadline: r.deadline || null }))
                            )
                          )
                        }
                      />
                      {/* Active assignments — saved team with role + deadline */}
                      {p.assignments.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                          <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                            <Users className="h-2.5 w-2.5" /> Active Team — {p.assignments.length} allocated
                          </p>
                           <div className="flex flex-wrap gap-1.5">
                            {p.assignments.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center gap-1.5 rounded-full bg-night-850 border border-white/10 pl-0.5 pr-2 py-0.5"
                              >
                                <span className="h-5 w-5 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300 shrink-0">
                                  {initials(a.user_name || "?")}
                                </span>
                                <span className="text-[10px] text-slate-200 font-medium max-w-[90px] truncate">{a.user_name}</span>
                                <span className={`badge !px-1 !py-0 text-[9px] ${ROLE_TINTS[a.role_key] || "bg-white/10 text-slate-400"}`}>{a.role_label}</span>
                                {a.allotment_deadline ? (
                                  <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                                    <CalendarDays className="h-2.5 w-2.5" /> {fmtDate(a.allotment_deadline)}
                                  </span>
                                ) : null}
                                {!a.on_leave && canManage && p.status === "in_progress" && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setExtendTarget({ projectId: p.id, assignment: a }); }}
                                    className="p-0.5 rounded text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                                    title={`Extend ${a.user_name}'s deadlines`}
                                    aria-label={`Extend ${a.user_name}'s deadlines`}
                                  >
                                    <CalendarDays className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-2.5 space-y-2">
                    {p.tasks.length === 0 ? (
                      <p className="text-[11px] text-slate-500 py-2 text-center">{p.status === "pending_approval" ? "Tasks will be generated once approved." : "No tasks yet."}</p>
                    ) : (
                      <>
                        {canManage && (
                          <div className="flex justify-end">
                            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
                              {(["list", "board"] as const).map((mode) => (
                                <button
                                  key={mode}
                                  type="button"
                                  onClick={() => { setBoardMode((s) => ({ ...s, [p.id]: mode === "board" })); setBoardOpenId(null); }}
                                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-medium transition-colors capitalize ${
                                    (boardMode[p.id] === true) === (mode === "board")
                                      ? "bg-brand-300 text-night-950"
                                      : "text-slate-400 hover:text-white"
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {boardMode[p.id] ? (
                          <KanbanBoard
                            tasks={p.tasks}
                            canManage={canManage}
                            openTaskId={boardOpenId}
                            onToggleOpen={(id) => setBoardOpenId(boardOpenId === id ? null : id)}
                            onMove={moveCard}
                            renderExpanded={(t) => (
                              <div className="space-y-1">
                                <TaskActions task={t} roleKey={roleKey} userId={userId} permissions={permissions} onExpand={(id) => setOpenTaskId(openTaskId === id ? null : id)} />
                                {openTaskId === t.id && (
                                  <div className="rounded-md bg-white/5 p-2 animate-fade-in">
                                    <TaskDetails task={t} roleKey={roleKey} userId={userId} permissions={permissions} />
                                  </div>
                                )}
                              </div>
                            )}
                          />
                        ) : (
                          p.tasks.map((t) => {
                        const isExpanded = expandedTaskId === t.id;
                        const overdue = t.due_date && t.status !== "completed" && new Date(isoDate(t.due_date) + "T23:59:59") < new Date();
                        return (
                          <div key={t.id} id={`task-${t.id}`} className="rounded-md border border-white/10 overflow-hidden bg-night-850/60 transition-all duration-500">
                            <button type="button" onClick={() => setExpandedTaskId(isExpanded ? null : t.id)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-medium text-white truncate leading-tight">{t.title}</p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[10px] text-slate-500">
                                  <span className="text-slate-600">{fmtDate(t.created_at)} · {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                  {t.role_label && <span className={`badge !px-1.5 !py-0 text-[10px] ${t.role_key ? ROLE_TINTS[t.role_key] || "bg-white/10 text-slate-400" : "bg-white/10 text-slate-400"}`}>{t.role_label}</span>}
                                  {(t.assignees?.length ? t.assignees : t.assignee_name ? [{ id: t.assigned_to || "", name: t.assignee_name }] : []).map((m) => (
                                    <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 pl-0.5 pr-1 py-0.5">
                                      <span className="h-4 w-4 rounded-full bg-brand-300/15 flex items-center justify-center text-[8px] font-bold text-brand-300 shrink-0">{initials(m.name)}</span>
                                      <span className="text-[10px] text-slate-300 max-w-[90px] truncate">{m.name}</span>
                                      {canManage && t.status !== "completed" && !t.step_key?.includes("_d_") && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm(`Remove ${m.name} from "${t.title}"?`)) run(() => removeTaskAssigneeAction(t.id, m.id));
                                          }}
                                          disabled={pending}
                                          className="p-0.5 rounded-full text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors disabled:opacity-40"
                                          title={`Remove ${m.name}`}
                                          aria-label={`Remove ${m.name}`}
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      )}
                                    </span>
                                  ))}
                                  {!t.assignees?.length && !t.assignee_name && <span className="text-slate-600">Unassigned</span>}
                                  <span className={overdue ? "text-rose-300 font-medium" : "text-slate-400"}><CalendarDays className="h-3 w-3 inline-block mr-0.5" />{fmtDate(t.due_date)}{overdue && " · overdue"}</span>
                                  <StatusBadge status={t.status} />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <PlatformBadges platforms={t.platforms} />
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                              </div>
                            </button>
                            {isExpanded && (
                              <div className="border-t border-white/10 bg-white/[0.02] px-3 pb-3 animate-slide-down">
                                <div className="space-y-2.5 pt-2.5">
                                  {t.description && (
                                    <div className="rounded-md bg-white/5 p-2">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Description</p>
                                      <p className="text-[12px] text-slate-300 whitespace-pre-wrap leading-snug">{t.description}</p>
                                    </div>
                                  )}
                                  {t.on_leave_note && (
                                    <div className="rounded-md bg-amber-400/10 border border-amber-400/30 p-2">
                                      <p className="text-[11px] text-amber-300 flex items-center gap-1"><Coffee className="h-3 w-3" />{t.on_leave_note}</p>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 bg-white/[0.03] rounded-md px-2 py-1.5 border border-white/5">
                                    <span>Created {fmtDate(t.created_at)} {new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    {t.brief_approved_at && <span>Approved {fmtDate(t.brief_approved_at)} {new Date(t.brief_approved_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                                    {t.due_date && <span>Due {fmtDate(t.due_date)}</span>}
                                    {t.completed_at && <span className="text-emerald-300">Completed {fmtDate(t.completed_at as any)} {new Date(t.completed_at as any).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                                  </div>
                                  {canManage && t.status !== "completed" && (
                                    <div className="rounded-md border border-white/10 bg-white/5 p-2">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Deadline</p>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <div className="w-[130px] shrink-0"><DatePicker value={isoDate(t.due_date) || undefined} placeholder="Set date…" onChange={(v) => { if (v && v !== isoDate(t.due_date)) run(() => updateTaskDueDateAction(t.id, v)); }} /></div>
                                        <span className="text-[9px] uppercase tracking-wider text-slate-500">Extend:</span>
                                        {[1, 3, 7].map((n) => (
                                          <button key={n} disabled={pending} onClick={() => run(() => updateTaskDueDateAction(t.id, extendIso(isoDate(t.due_date), n)))} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50 hover:text-brand-200 transition-colors disabled:opacity-40 shrink-0">+{n}d</button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {(has("tasks:manage") || has("leads:manage") || ["SUPER_ADMIN", "PROJECT_MANAGER", "SALES"].includes(roleKey)) && (
                                    <div className="rounded-md border border-white/10 bg-white/5 p-2">
                                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Remarks / Brief</p>
                                      <RichTextEditor
                                        value={t.remarks || ""}
                                        minRows={2}
                                        maxLength={10000}
                                        onChange={() => {}}
                                        onBlur={(html) => {
                                          if (html !== (t.remarks || "")) run(() => updateTaskRemarksAction(t.id, html));
                                        }}
                                        placeholder="Add initial content, brief, or remarks for cross-department collaboration…"
                                      />
                                    </div>
                                  )}
                                  {canManage && t.step_key?.includes("_d_") && (t.status === "pending_approval" || t.status === "rejected") && (
                                    <TaskBriefManager task={t} />
                                  )}
                                  {canManage && t.step_key?.includes("_d_") && t.brief_approved_at && t.status !== "completed" && (
                                    <TaskSequenceEditor task={t} available={projectTeamOptions} />
                                  )}
                                  <div className="pt-1.5 border-t border-white/10"><TaskActions task={t} roleKey={roleKey} userId={userId} permissions={permissions} onExpand={(id) => setOpenTaskId(openTaskId === id ? null : id)} /></div>
                                  {openTaskId === t.id && (<div className="rounded-md bg-white/5 p-2 animate-fade-in"><TaskDetails task={t} roleKey={roleKey} userId={userId} permissions={permissions} /></div>)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                        })
                        )
                      }
                        </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {extendTarget && (
        <ExtendPersonModal
          assignment={extendTarget.assignment}
          pending={pending}
          onClose={() => setExtendTarget(null)}
          onSubmit={(days) =>
            run(async () => {
              const res = await extendPersonDeadlineAction(extendTarget.projectId, extendTarget.assignment.user_id, days);
              if (res?.error) toast(res.error, "error");
              else setExtendTarget(null);
            })
          }
        />
      )}
    </div>
  );
}

function ExtendPersonModal({
  assignment,
  pending,
  onClose,
  onSubmit,
}: {
  assignment: Assignment;
  pending: boolean;
  onClose: () => void;
  onSubmit: (days: number) => void;
}) {
  const [days, setDays] = useState(1);
  return (
    <Modal open onClose={onClose} title="Extend individual deadline">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit(days); }}>
        <p className="text-xs text-slate-400">
          Extend deadlines for <span className="font-semibold text-white">{assignment.user_name}</span> ({assignment.role_label})&apos;s open tasks only. Other team members are not affected.
        </p>
        <div>
          <label className="label">Additional working days</label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className="input !w-24" required />
            {[1, 2, 3, 5, 7].map((n) => (
              <button key={n} type="button" onClick={() => setDays(n)} className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${days === n ? "bg-brand-300 text-night-950" : "bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50"}`}>{n}d</button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Extending…" : `Extend ${days} working day${days === 1 ? "" : "s"}`}
        </button>
      </form>
    </Modal>
  );
}
