"use client";

import { Fragment, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Users,
  CalendarDays,
  Coffee,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  approveProjectAction,
  rejectProjectAction,
  deleteProjectAction,
  assignProjectTeamAction,
  updateTaskDueDateAction,
  setMemberLeaveAction,
} from "@/lib/actions/projects";
import type { PipelineClient } from "@/lib/data";
import type { Assignment, UserRow } from "@/lib/types";
import { StatusBadge, PlatformBadges } from "@/components/ui";
import { TaskActions, TaskDetails } from "@/components/TaskWorkflow";
import { DatePicker } from "@/components/DatePicker";
import { Modal } from "@/components/ui";
import { DynamicTeamAllotment, type TeamAllocationRow } from "@/components/DynamicTeamAllotment";

/** Postgres DATE columns may arrive as Date objects — normalize to YYYY-MM-DD. */
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
  PROJECT_MANAGER: "bg-violet-400/10 text-violet-300",
  SUPER_ADMIN: "bg-brand-300/10 text-brand-300",
};

function fmtDate(d: string | Date | null | undefined) {
  const iso = isoDate(d);
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Extend an ISO date by N working days (Sundays excluded), matching the server engine. */
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
  userId,
}: {
  client: PipelineClient;
  team: UserRow[];
  roleKey: string;
  userId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ projectId: string; assignment: Assignment } | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [allotmentRows, setAllotmentRows] = useState<TeamAllocationRow[]>([]);

  const canManage = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const canDelete = roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  function handleAllotmentRowAdd(projectId: string, row: TeamAllocationRow) {
    if (!row.role_key || !row.user_id) return;
    setAllotmentRows((prev) => {
      const exists = prev.some((r) => r.role_key === row.role_key && r.user_id === row.user_id);
      if (exists) return prev;
      return [...prev, row];
    });
    run(() => assignProjectTeamAction(projectId, [{ role_key: row.role_key, user_id: row.user_id! }]));
  }

  function handleAllotmentRowRemove(id: string) {
    setAllotmentRows((prev) => prev.filter((r) => r.id !== id));
  }

  const totalTasks = client.projects.reduce((n, p) => n + p.total_tasks, 0);
  const doneTasks = client.projects.reduce((n, p) => n + p.completed_tasks, 0);
  const activeProjects = client.projects.filter((p) => p.status === "in_progress").length;
  const pendingProjects = client.projects.filter((p) => p.status === "pending_approval").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-300 transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All clients
          </Link>
          <h1 className="text-xl font-bold tracking-tight">{client.client_name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
            <span>
              <span className="font-semibold text-white">{client.projects.length}</span> project
              {client.projects.length === 1 ? "" : "s"}
            </span>
            <span>
              <span className="font-semibold text-brand-300">{activeProjects}</span> in production
            </span>
            {pendingProjects > 0 && (
              <span>
                <span className="font-semibold text-amber-300">{pendingProjects}</span> awaiting approval
              </span>
            )}
            <span>
              <span className="font-semibold text-emerald-300">{doneTasks}</span>/{totalTasks} tasks done
            </span>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-4">
        {client.projects.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {/* Project header */}
            <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Client deadline: {fmtDate(p.deadline)}
                    </span>
                    <span>
                      {p.completed_tasks}/{p.total_tasks} tasks
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canManage && p.status === "pending_approval" && (
                    <>
                      <button
                        className="btn-primary !py-1 !px-2 text-[11px]"
                        disabled={pending}
                        onClick={() => run(() => approveProjectAction(p.id))}
                      >
                        <Check className="h-3 w-3" /> Approve & generate tasks
                      </button>
                      <button
                        className="btn-ghost !text-rose-400 !py-1 !px-1.5 text-[11px]"
                        disabled={pending}
                        onClick={() => run(() => rejectProjectAction(p.id))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      className="btn-ghost !text-rose-400 !py-1 !px-1.5 text-[11px]"
                      disabled={pending}
                      onClick={() => {
                        if (confirm(`Delete "${p.name}" and all of its tasks?`)) run(() => deleteProjectAction(p.id));
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Team roster */}
              {p.assignments.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Users className="h-3 w-3 text-slate-300" />
                  {p.assignments.map((a) =>
                    a.on_leave ? (
                      <span
                        key={a.id}
                        title={`On leave${a.leave_days ? ` (${a.leave_days}d)` : ""}${a.leave_reason ? `: ${a.leave_reason}` : ""}`}
                        className="badge bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30"
                      >
                        <Coffee className="h-3 w-3 mr-0.5" />
                        {a.role_label}: {a.user_name} · on leave{a.leave_days ? ` ${a.leave_days}d` : ""}
                      </span>
                    ) : (
                      <span key={a.id} className="badge bg-white/10 text-slate-400">
                        {a.role_label}: {a.user_name}
                      </span>
                    )
                  )}
                  {canManage && p.status === "in_progress" && (
                    <>
                      {p.assignments.some((a) => !a.on_leave) && (
                        <button
                          className="badge bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors cursor-pointer ring-1 ring-transparent hover:ring-amber-400/40"
                          onClick={() =>
                            setLeaveTarget({ projectId: p.id, assignment: p.assignments.find((a) => !a.on_leave)! })
                          }
                        >
                          <Coffee className="h-3 w-3 mr-0.5" /> Mark on leave…
                        </button>
                      )}
                      <button
                        className="badge bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20 transition-colors cursor-pointer ring-1 ring-transparent hover:ring-emerald-400/40"
                        onClick={() => {
                          const onLeave = p.assignments.filter((a) => a.on_leave);
                          if (onLeave.length === 0) return;
                          setLeaveTarget({ projectId: p.id, assignment: onLeave[0] });
                        }}
                      >
                        Manage leave
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Team allocation */}
            {canManage && p.status === "in_progress" && (
              <div className="px-4 pt-3">
                <DynamicTeamAllotment
                  project={p as unknown as Parameters<typeof DynamicTeamAllotment>[0]["project"]}
                  team={team}
                  initialAllocations={allotmentRows}
                  onRowAdd={(row) => handleAllotmentRowAdd(p.id, row)}
                  onRowRemove={handleAllotmentRowRemove}
                />
              </div>
            )}

            {/* Tasks — Accordion View */}
            <div className="p-4 space-y-3">
              {p.tasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  {p.status === "pending_approval"
                    ? "Tasks will be generated automatically once approved."
                    : "No tasks yet."}
                </p>
              ) : (
                p.tasks.map((t) => {
                  const isExpanded = expandedTaskId === t.id;
                  const overdue =
                    t.due_date && t.status !== "completed" &&
                    new Date(isoDate(t.due_date) + "T23:59:59") < new Date();
                  return (
                    <div
                      key={t.id}
                      className="card overflow-hidden bg-night-850/80"
                    >
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{t.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                            {t.role_label && (
                              <span className={`badge ${ROLE_TINTS[t.role_key] || "bg-white/10 text-slate-400"}`}>
                                {t.role_label}
                              </span>
                            )}
                            {t.assignee_name ? (
                              <span className="flex items-center gap-1.5">
                                <span className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-slate-300 shrink-0">
                                  {initials(t.assignee_name)}
                                </span>
                                <span className="truncate max-w-[120px]">{t.assignee_name}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">Unassigned</span>
                            )}
                            <span className={overdue ? "text-rose-300 font-medium" : "text-slate-400"}>
                              <CalendarDays className="h-3 w-3 inline-block mr-1" />
                              {fmtDate(t.due_date)}{overdue && " · overdue"}
                            </span>
                            <StatusBadge status={t.status} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PlatformBadges platforms={t.platforms} />
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="border-t border-white/10 bg-white/[0.02] px-4 pb-4 animate-slide-down">
                          <div className="space-y-4 pt-3">
                            {/* Description */}
                            {t.description && (
                              <div className="rounded-lg bg-white/5 p-3">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Description</p>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap">{t.description}</p>
                              </div>
                            )}

                            {/* On Leave Note */}
                            {t.on_leave_note && (
                              <div className="rounded-lg bg-amber-400/10 border border-amber-400/30 p-3">
                                <p className="text-xs text-amber-300 flex items-center gap-1">
                                  <Coffee className="h-3 w-3" /> {t.on_leave_note}
                                </p>
                              </div>
                            )}

                            {/* Deadline Management */}
                            {canManage && t.status !== "completed" && (
                              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" /> Deadline Management
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="w-[140px] shrink-0">
                                    <DatePicker
                                      value={isoDate(t.due_date) || undefined}
                                      placeholder="Set date…"
                                      onChange={(v) => {
                                        if (v && v !== isoDate(t.due_date)) {
                                          run(() => updateTaskDueDateAction(t.id, v));
                                        }
                                      }}
                                    />
                                  </div>
                                  <span className="text-[9px] uppercase tracking-wider text-slate-500">Extend (Sun skipped):</span>
                                  {[1, 3, 7].map((n) => (
                                    <button
                                      key={n}
                                      disabled={pending}
                                      onClick={() =>
                                        run(() =>
                                          updateTaskDueDateAction(t.id, extendIso(isoDate(t.due_date), n))
                                        )
                                      }
                                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/5 border border-white/10 text-slate-300 hover:border-brand-300/50 hover:text-brand-200 transition-colors disabled:opacity-40 shrink-0"
                                    >
                                      +{n}d
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Task Workflow Actions */}
                            <div className="pt-2 border-t border-white/10">
                              <TaskActions
                                task={t}
                                roleKey={roleKey}
                                userId={userId}
                                onExpand={(id) => setOpenTaskId(openTaskId === id ? null : id)}
                              />
                            </div>

                            {/* Expanded Task Details (comments, history, etc.) */}
                            {openTaskId === t.id && (
                              <div className="rounded-lg bg-white/5 p-3 animate-fade-in">
                                <TaskDetails task={t} roleKey={roleKey} userId={userId} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Emergency leave modal */}
      {leaveTarget && (
        <LeaveModal
          assignment={leaveTarget.assignment}
          pending={pending}
          onClose={() => setLeaveTarget(null)}
          onSubmit={(days, reason) =>
            run(async () => {
              const res = await setMemberLeaveAction(leaveTarget.projectId, leaveTarget.assignment.user_id, days, reason);
              if (!res?.error) setLeaveTarget(null);
            })
          }
        />
      )}
    </div>
  );
}

function LeaveModal({
  assignment,
  pending,
  onClose,
  onSubmit,
}: {
  assignment: Assignment;
  pending: boolean;
  onClose: () => void;
  onSubmit: (days: number, reason: string) => void;
}) {
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState("");

  return (
    <Modal open onClose={onClose} title="Emergency leave — cascade deadlines">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(days, reason);
        }}
      >
        <p className="text-xs text-slate-400">
          Marking <span className="font-semibold text-white">{assignment.user_name}</span> ({assignment.role_label}) on
          leave extends their open task deadlines by the given working days (Sundays excluded) and shifts every later
          task accordingly.
        </p>
        <div>
          <label className="label">Leave duration (working days)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
            className="input !w-28"
            required
          />
        </div>
        <div>
          <label className="label">Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            placeholder="Family emergency, medical, travel…"
            required
            minLength={3}
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "Applying…" : "Apply & cascade deadlines"}
        </button>
      </form>
    </Modal>
  );
}
