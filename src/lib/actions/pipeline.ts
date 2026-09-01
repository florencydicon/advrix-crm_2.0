"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import type { Task, TaskStatus } from "@/lib/types";
import { advanceTaskStep, markTaskComplete, reopenTask, setTaskTeam } from "@/lib/workflow";
import { sanitizeRich, richToPlain } from "@/lib/rich";
import { createNotification, notifyRoles } from "@/lib/notifications";

const PERM_PROJECTS_VIEW = "projects:view";
const PERM_PROJECTS_MANAGE = "projects:manage";
const PERM_TASKS_MANAGE = "tasks:manage";
const PERM_TASKS_REVIEW = "tasks:review";

export interface PipelineBoardPayload {
  active: Task[];
  completed: Task[];
  canManage: boolean;
  canReopen: boolean;
  canApprove: boolean;
  roleKey: string | null;
  userId: string | null;
  isBroad: boolean;
}

const PIPELINE_TASK_SELECT = `
  SELECT t.*, p.name AS project_name, c.name AS client_name, c.company AS client_company,
         u.full_name AS assignee_name, r.label AS role_label,
         t.due_date::text AS due_date,
         t.brief_approved_at::text AS brief_approved_at,
         t.current_step,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', ta.user_id, 'name', ua.full_name, 'role_key', r2.key, 'role_label', r2.label
           ) ORDER BY ta.position ASC, ta.added_at ASC)
           FROM task_assignees ta
           JOIN users ua ON ua.id = ta.user_id
           LEFT JOIN roles r2 ON r2.id = ua.role_id
           WHERE ta.task_id = t.id
         ), '[]'::json) AS assignees,
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', tc.id, 'step', tc.step, 'user_id', tc.user_id, 'user_name', tc.user_name,
             'role_label', tc.role_label, 'content', tc.content, 'status', tc.status,
             'review_comment', tc.review_comment, 'reviewed_by', tc.reviewed_by,
             'submitted_at', tc.submitted_at::text, 'reviewed_at', tc.reviewed_at::text
           ) ORDER BY tc.step ASC, tc.submitted_at ASC)
           FROM task_contributions tc
           WHERE tc.task_id = t.id
         ), '[]'::json) AS contributions,
         reu.id AS remarks_edited_by, reu.full_name AS remarks_edited_by_name,
         rer.label AS remarks_edited_by_role, t.remarks_edited_at::text AS remarks_edited_at
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  LEFT JOIN users u ON u.id = t.assigned_to
  LEFT JOIN roles r ON r.key = t.role_key
  LEFT JOIN users reu ON reu.id = t.remarks_edited_by
  LEFT JOIN roles rer ON rer.id = reu.role_id
`;

/**
 * Loads the two-sided Project Pipeline for the current user.
 *
 * RBAC scoping:
 *  - "Broad" viewers (Super Admin via `admin:*`, or Project Managers with both
 *    projects:view + projects:manage) see the ENTIRE pipeline across all clients.
 *  - Everyone else only ever sees the tasks they are directly assigned to
 *    (or members of the task's assignees) — strictly filtered to their own work.
 *
 * Completed tasks (status = 'completed') go to History; everything else lands on
 * the Active Board.
 */
export async function getPipelineBoardAction(): Promise<PipelineBoardPayload> {
  const session = await getSession();
  if (!session) return { active: [], completed: [], canManage: false, canReopen: false, canApprove: false, roleKey: null, userId: null, isBroad: false };

  const perms = session.permissions || [];
  const isBroad =
    perms.includes("admin:*") ||
    (hasPermission(perms, PERM_PROJECTS_VIEW) && hasPermission(perms, PERM_PROJECTS_MANAGE));
  const canManage = hasPermission(perms, PERM_TASKS_MANAGE);
  const canApprove = hasPermission(perms, PERM_TASKS_MANAGE) || hasPermission(perms, PERM_TASKS_REVIEW);
  const canReopen = perms.includes("admin:*");
  const scope = isBroad
    ? ""
    : `WHERE (t.assigned_to = $1 OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1))`;
  const params: (string | null)[] = isBroad ? [] : [session.sub];

  const rows = await query<Task>(
    `${PIPELINE_TASK_SELECT} ${scope} ORDER BY c.name ASC, p.name ASC, t.created_at DESC`,
    params
  );

  const active: Task[] = [];
  const completed: Task[] = [];
  for (const r of rows) {
    if (r.status === "completed") completed.push(r);
    else active.push(r);
  }

  return { active, completed, canManage, canReopen, canApprove, roleKey: session.role_key, userId: session.sub, isBroad };
}

async function requireAuth() {
  const session = await getSession();
  return session;
}

async function taskOf(taskId: string) {
  const t = (
    await query<{ assigned_to: string | null; status: string; title: string }>(
      `SELECT assigned_to, status, title FROM tasks WHERE id = $1`,
      [taskId]
    )
  )[0];
  return t || null;
}

/** Roles allowed to edit the task Title / Content/Copy fields directly. */
function isContentEditor(session: {
  role_key?: string | null;
  permissions?: string[];
}): boolean {
  const role = (session.role_key || "").toUpperCase();
  if (
    role === "SUPER_ADMIN" ||
    role === "PROJECT_MANAGER" ||
    role === "ADMIN" ||
    role === "PM" ||
    role === "WRITER" ||
    role === "CONTENT_WRITER"
  ) {
    return true;
  }
  return hasPermission(session.permissions, PERM_TASKS_MANAGE);
}

/** Notification deep-links — unified Project Pipeline with the TaskModal auto-opened. */
function taskPipelineLink(taskId: string) {
  return `/projects?taskId=${encodeURIComponent(taskId)}`;
}

/** Notification deep-links — unified Employee Dashboard with the TaskModal auto-opened. */
function taskDashboardLink(taskId: string) {
  return `/dashboard?taskId=${encodeURIComponent(taskId)}`;
}

/** QC Gatekeeper — only Admins/PMs (tasks:manage or tasks:review) may approve or reject work. */
function isGatekeeper(session: { permissions?: string[] } | null): boolean {
  return (
    !!session &&
    (hasPermission(session.permissions, PERM_TASKS_MANAGE) ||
      hasPermission(session.permissions, PERM_TASKS_REVIEW))
  );
}

function revalidate() {
  revalidatePath("/projects");
}

/**
 * Submit for Review (Employee) — flags the task as `submitted` for the QC
 * gatekeeper. It does NOT advance the stageIndex or change the assignee: the
 * task stays with the employee until an Admin/PM approves or rejects it.
 */
export async function submitPipelineTaskAction(
  taskId: string,
  remarks?: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "completed") return { ok: false, error: "Task is already completed." };
  if (task.status === "submitted") return { ok: false, error: "Already submitted for review." };
  const isAssignee = task.assigned_to === session.sub;
  if (!isAssignee && !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  // Persist the final remark text into the Remarks/Content box the QC sees.
  const html = sanitizeRich(String(remarks ?? ""));
  await query(
    `UPDATE tasks SET remarks = $1, remarks_edited_by = $2, remarks_edited_at = now(),
     status = 'submitted', reviewed_at = NULL
     WHERE id = $3`,
    [html, session.sub, taskId]
  );
  await notifyRoles(["PROJECT_MANAGER", "SUPER_ADMIN"], {
    type: "task",
    title: "Task ready for review",
    body: `${session.name} submitted "${task.title || "a task"}" for review.`,
    link: taskPipelineLink(taskId),
  });
  revalidate();
  return { ok: true };
}

/**
 * Approve & Advance (Admin/PM gatekeeper) — the ONLY action that pushes a task
 * down its sequence (A→B→C): marks the current stage approved, auto-assigns the
 * next member with status `approved`, or completes the task after the final stage.
 */
export async function approvePipelineTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isGatekeeper(session)) return { ok: false, error: "Only Admins / PMs can approve work." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "completed") return { ok: false, error: "Task is already completed." };
  const prevAssignee = task.assigned_to;
  const next = await advanceTaskStep(taskId);
  if (next === null) {
    // Reached the end of the sequence — mark fully complete.
    await markTaskComplete(taskId);
  }
  const after = await taskOf(taskId);
  if (prevAssignee && prevAssignee !== session.sub) {
    await createNotification({
      userId: prevAssignee,
      type: "task",
      title: after?.status === "completed" ? "Task completed" : "Stage approved",
      body: after?.status === "completed"
        ? `"${task.title || "Your task"}" was approved and completed.`
        : `"${task.title || "Your task"}" was approved — it moves to the next stage.`,
      link: taskDashboardLink(taskId),
    });
  }
  if (after?.assigned_to && after.assigned_to !== prevAssignee && after.assigned_to !== session.sub) {
    await createNotification({
      userId: after.assigned_to,
      type: "task",
      title: "You're up next",
      body: `"${after.title || task.title || "A task"}" is ready for the next stage.`,
      link: taskDashboardLink(taskId),
    });
  }
  revalidate();
  return { ok: true };
}

/**
 * Send Back (Admin/PM gatekeeper) — rejects the submitted work. Keeps the
 * current assignee on the task and flips the status to `needs_improvement` for
 * rework, WITHOUT changing the stageIndex or moving the sequence backward.
 *
 * The current Remarks/Content text is prepended with the author's signature —
 * `[Feedback by {FirstName} - {Role}]` — and any prior remarks are preserved
 * below, so the assignee always knows who requested the fix and what to do.
 */
export async function sendBackPipelineTaskAction(
  taskId: string,
  feedback?: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isGatekeeper(session)) return { ok: false, error: "Only Admins / PMs can reject work." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "completed") return { ok: false, error: "Completed tasks live in History." };

  // Compose the signed feedback and persist it into the Remarks/Content box.
  const firstName = (session.name || "User").split(" ")[0] || "User";
  const role = session.role_label || session.role_key || "Team";
  const signature = `[Feedback by ${firstName} - ${role}]`;
  const typed = richToPlain(sanitizeRich(String(feedback ?? ""))).trim();

  const existingRow = await query<{ remarks: string | null }>(
    `SELECT remarks FROM tasks WHERE id = $1`,
    [taskId]
  );
  const existing = existingRow[0]?.remarks || "";
  const existingPlain = existing ? richToPlain(existing).trim() : "";

  // Skip re-appending the current text if it was already saved by auto-save.
  const appendPrevious = existingPlain && existingPlain !== typed;
  const share = typed || "requested rework.";
  const newRemarks = `${signature}: ${share}` + (appendPrevious ? `\n\n${existing}` : "");

  await query(
    `UPDATE tasks SET remarks = $1, remarks_edited_by = $2, remarks_edited_at = now(),
     status = 'needs_improvement', reviewed_at = now()
     WHERE id = $3`,
    [newRemarks, session.sub, taskId]
  );

  if (task.assigned_to && task.assigned_to !== session.sub) {
    await createNotification({
      userId: task.assigned_to,
      type: "task",
      title: "Task sent back for rework",
      body: `${session.name} requested changes on "${task.title || "your task"}".`,
      link: taskDashboardLink(taskId),
    });
  }

  revalidate();
  return { ok: true };
}

/**
 * Re-open (Super Admin only) — pulls a completed History task back onto the
 * Active Board so its pipeline can resume.
 */
export async function reopenPipelineTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!(session.permissions || []).includes("admin:*")) {
    return { ok: false, error: "Only Super Admin can re-open tasks." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status !== "completed") return { ok: false, error: "Task is not completed." };
  await reopenTask(taskId);
  revalidate();
  return { ok: true };
}

/** Directly moves an active task to a target column (drag & drop on the board). */
export async function movePipelineTaskAction(
  taskId: string,
  status: TaskStatus
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (status === "completed") {
    await markTaskComplete(taskId);
  } else {
    await query(`UPDATE tasks SET status = $2 WHERE id = $1`, [taskId, status]);
  }
  revalidate();
  return { ok: true };
}

/**
 * Ultra-lean Remarks / Content field. Persists free-form remarks written by the
 * current assignee (or a manager). Returns the plain-text so the UI can drive
 * the dynamic marquee heading offline.
 */
export async function setPipelineTaskRemarksAction(
  taskId: string,
  remarks: string
): Promise<{ ok: boolean; text?: string; editedByName?: string; editedByRole?: string; editedAt?: string; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  const isAssignee = task.assigned_to === session.sub;
  if (!isAssignee && !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const html = sanitizeRich(String(remarks ?? ""));
  await query(
    `UPDATE tasks SET remarks = $1, remarks_edited_by = $2, remarks_edited_at = now() WHERE id = $3`,
    [html, session.sub, taskId]
  );
  revalidate();
  return {
    ok: true,
    text: richToPlain(html),
    editedByName: session.name,
    editedByRole: session.role_label,
    editedAt: new Date().toISOString(),
  };
}

/**
 * Task Title — renames the sub-task in the database. Only content editors
 * (WRITER/CONTENT_WRITER) and managers (PM/ADMIN/SUPER_ADMIN) may edit it.
 */
export async function setPipelineTaskTitleAction(
  taskId: string,
  title: string
): Promise<{ ok: boolean; title?: string; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isContentEditor(session)) {
    return { ok: false, error: "Only content editors and managers can rename tasks." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  const clean = String(title ?? "").trim().replace(/[\n\r]+/g, " ").slice(0, 200);
  if (!clean) return { ok: false, error: "Task title cannot be empty." };
  await query(`UPDATE tasks SET title = $2 WHERE id = $1`, [taskId, clean]);
  revalidate();
  return { ok: true, title: clean };
}

/**
 * Content / Copy — the draft work body. Persists the working text for the
 * current stage. Only content editors and managers may edit it.
 */
export async function setPipelineTaskContentAction(
  taskId: string,
  content: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!isContentEditor(session)) {
    return { ok: false, error: "Only content editors and managers can edit the content." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  await query(`UPDATE tasks SET content = $2 WHERE id = $1`, [taskId, String(content ?? "")]);
  revalidate();
  return { ok: true };
}

/**
 * Ultra-lean Team Assignment — replaces the sequential team (order preserved)
 * for one task. Manager / reviewer only. Auto-points the task at the first
 * member if it is not yet started.
 */
export async function updatePipelineTaskTeamAction(
  taskId: string,
  memberIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (Array.isArray(memberIds) && memberIds.length > 0) {
    await setTaskTeam(taskId, memberIds);
  }
  revalidate();
  return { ok: true };
}

/**
 * Delete a sub-task / sequence task from the pipeline. Manager gatekeepers
 * (tasks:manage) only. Dependent rows (task_assignees, task_contributions)
 * are removed automatically via ON DELETE CASCADE.
 */
export async function deletePipelineTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  if (!hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  await query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
  revalidate();
  return { ok: true };
}
