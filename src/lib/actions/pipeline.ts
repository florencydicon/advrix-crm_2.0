"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import type { Task, TaskStatus } from "@/lib/types";
import { advanceTaskStep, markTaskComplete, stepTaskBack, reopenTask } from "@/lib/workflow";

const PERM_PROJECTS_VIEW = "projects:view";
const PERM_PROJECTS_MANAGE = "projects:manage";
const PERM_TASKS_MANAGE = "tasks:manage";

export interface PipelineBoardPayload {
  active: Task[];
  completed: Task[];
  canManage: boolean;
  canReopen: boolean;
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
         ), '[]'::json) AS contributions
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  JOIN clients c ON c.id = p.client_id
  LEFT JOIN users u ON u.id = t.assigned_to
  LEFT JOIN roles r ON r.key = t.role_key
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
  if (!session) return { active: [], completed: [], canManage: false, canReopen: false, userId: null, isBroad: false };

  const perms = session.permissions || [];
  const isBroad =
    perms.includes("admin:*") ||
    (hasPermission(perms, PERM_PROJECTS_VIEW) && hasPermission(perms, PERM_PROJECTS_MANAGE));
  const canManage = hasPermission(perms, PERM_TASKS_MANAGE);
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

  return { active, completed, canManage, canReopen, userId: session.sub, isBroad };
}

async function requireAuth() {
  const session = await getSession();
  return session;
}

async function taskOf(taskId: string) {
  const t = (
    await query<{ assigned_to: string | null; status: string }>(
      `SELECT assigned_to, status FROM tasks WHERE id = $1`,
      [taskId]
    )
  )[0];
  return t || null;
}

function revalidate() {
  revalidatePath("/projects");
}

/**
 * Complete — advances the active task down the predefined sequence (A→B→C),
 * auto-assigning the next member, or completing the task when it reaches the
 * end of its sequence (which then moves it to History).
 */
export async function completePipelineTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "completed") return { ok: false, error: "Task is already completed." };
  const isAssignee = task.assigned_to === session.sub;
  if (!isAssignee && !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const next = await advanceTaskStep(taskId);
  if (next === null) {
    // Reached the end of the sequence — mark fully complete.
    await markTaskComplete(taskId);
  }
  revalidate();
  return { ok: true };
}

/**
 * Send Back — pushes an active task one step backward along its sequence and
 * re-assigns the previous member for rework. Only the current assignee or a
 * manager may trigger it.
 */
export async function sendBackPipelineTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (task.status === "completed") return { ok: false, error: "Completed tasks live in History." };
  const isAssignee = task.assigned_to === session.sub;
  if (!isAssignee && !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  await stepTaskBack(taskId);
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
