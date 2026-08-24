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
import QuickAssignFullTeam from "@/components/QuickAssignFullTeam";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  const iso = d.slice(0, 10);
  return new Date(`${iso}T00:00:00`).toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  const canManage = roleKey === "PROJECT_MANAGER" || roleKey === "SUPER_ADMIN";
  const canDelete = roleKey === "SUPER_ADMIN";

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
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
                <div className="rounded-lg border border-white/10 bg-night-850 p-3">
                  <QuickAssignFullTeam
                    project={p as unknown as Parameters<typeof QuickAssignFullTeam>[0]["project"]}
                    team={team}
                    onAssignAll={(assignments) => run(() => assignProjectTeamAction(p.id, assignments))}
                    pending={pending}
                  />
                </div>
              </div>
            )}

            {/* Tasks */}
            <div className="p-4">
              {p.tasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  {p.status === "pending_approval"
                    ? "Tasks will be generated automatically once approved."
                    : "No tasks yet."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10 bg-night-850">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Task</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Role</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[110px]">Assignee</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[150px]">Due</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[110px]">Status</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[120px]">Published</th>
                        <th className="px-3 py-2 w-[160px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {p.tasks.map((t) => {
                        const open = openTaskId === t.id;
                        const overdue =
                          t.due_date && t.status !== "completed" &&
                          new Date(t.due_date.slice(0, 10) + "T23:59:59") < new Date();
                        return (
                          <Fragment key={t.id}>
                            <tr
                              className={`cursor-pointer transition-colors align-top ${open ? "bg-brand-300/[0.07]" : "hover:bg-white/[0.04]"}`}
                              onClick={() => setOpenTaskId(open ? null : t.id)}
                            >
                              <td className="px-3 py-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-white">{t.title}</p>
                                  {t.description && (
                                    <p className="text-[10px] text-slate-500 line-clamp-1">{t.description}</p>
                                  )}
                                  {t.on_leave_note && (
                                    <p className="text-[10px] text-amber-300 mt-0.5">☕ {t.on_leave_note}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                {t.role_label && <span className="badge bg-white/10 text-slate-400">{t.role_label}</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-300">{t.assignee_name || "—"}</td>
                              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                                {canManage && t.status !== "completed" ? (
                                  <DatePicker
                                    value={t.due_date ? t.due_date.slice(0, 10) : undefined}
                                    placeholder="Set date…"
                                    onChange={(v) => {
                                      if (v && v !== (t.due_date || "").slice(0, 10)) {
                                        run(() => updateTaskDueDateAction(t.id, v));
                                      }
                                    }}
                                  />
                                ) : (
                                  <span className={overdue ? "text-rose-300 font-medium" : "text-slate-300"}>
                                    {fmtDate(t.due_date)}
                                    {overdue && " · overdue"}
                                  </span>
                                )}
                              </td>
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
                              <tr className="bg-white/[0.03]">
                                <td colSpan={7} className="px-3 py-2">
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
