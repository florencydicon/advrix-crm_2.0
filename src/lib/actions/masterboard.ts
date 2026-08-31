"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { sanitizeRich, richToPlain, isEmptyRich } from "@/lib/rich";
import { markTaskComplete, setTaskTeam, setTaskDeadline } from "@/lib/workflow";
import { createNotification } from "@/lib/notifications";

const PERM_PROJECTS_VIEW = "projects:view";
const PERM_TASKS_MANAGE = "tasks:manage";
const PERM_PROJECTS_MANAGE = "projects:manage";
const PERM_PROJECTS_DELETE = "projects:delete";

// ---------------------------------------------------------------------------
// Master Board: single flat, monday.com-style task grid across all clients.
// ---------------------------------------------------------------------------

export interface MasterRow {
  id: string;
  client_id: string;
  client_name: string;
  client_company: string | null;
  project_id: string;
  project_name: string;
  group_key: string;
  step_key: string;
  sequence: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  assignee_name: string | null;
  role_label: string | null;
  due_date: string | null;
  completed: boolean;
  overdue: boolean;
  remarks: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface PortfolioClient {
  id: string;
  name: string;
  company: string | null;
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  completed_tasks: number;
  progress: number;
}

export interface MasterBoardPayload {
  rows: MasterRow[];
  clients: PortfolioClient[];
  canManage: boolean;
  isBroad: boolean;
}

/**
 * Loads the flat Master Board grid for the current employee.
 *
 * RBAC scoping:
 *  - "Broad" viewers (Super Admin via `admin:*`, or Project Managers with both
 *    projects:view + projects:manage) see the ENTIRE board across all clients.
 *  - Everyone else (e.g. a producer on dashboard) only ever sees the tasks they
 *    are directly assigned to — never private tasks from other teams/clients.
 */
export async function getMasterBoardAction(): Promise<MasterBoardPayload> {
  const session = await getSession();
  if (!session) return { rows: [], clients: [], canManage: false, isBroad: false };

  const perms = session.permissions || [];
  const isBroad =
    perms.includes("admin:*") ||
    (hasPermission(perms, PERM_PROJECTS_VIEW) && hasPermission(perms, PERM_PROJECTS_MANAGE));
  const canManage = hasPermission(perms, PERM_TASKS_MANAGE);

  const scope = isBroad
    ? ""
    : `WHERE (t.assigned_to = $1 OR EXISTS (SELECT 1 FROM task_assignees ta WHERE ta.task_id = t.id AND ta.user_id = $1))`;
  const params = isBroad ? [] : [session.sub];

  const rows = await query<MasterRow>(
    `SELECT t.id, c.id AS client_id, c.name AS client_name, c.company AS client_company,
            p.id AS project_id, p.name AS project_name,
            t.group_key, t.step_key, t.sequence, t.title, t.description, t.status, t.priority,
            t.assigned_to, u.full_name AS assignee_name, r.label AS role_label,
            t.due_date::text AS due_date,
            (t.status = 'completed') AS completed,
            (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE AND t.status <> 'completed') AS overdue,
            t.remarks, t.created_at::text AS created_at, t.completed_at::text AS completed_at
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN clients c ON c.id = p.client_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN roles r ON r.key = t.role_key
     ${scope}
     ORDER BY c.name ASC, p.name ASC, t.created_at DESC`,
    params
  );

  const clients = await query<PortfolioClient>(
    `SELECT c.id, c.name, c.company,
            (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id) AS total_projects,
            (SELECT COUNT(*)::int FROM projects p WHERE p.client_id = c.id AND p.status = 'in_progress') AS active_projects,
            (SELECT COUNT(*)::int FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.client_id = c.id) AS total_tasks,
            (SELECT COUNT(*)::int FROM tasks t JOIN projects p ON p.id = t.project_id WHERE p.client_id = c.id AND t.status = 'completed') AS completed_tasks
     FROM clients c
     ORDER BY c.name ASC`
  );

  for (const cl of clients) {
    cl.progress = cl.total_tasks === 0 ? 0 : Math.round((cl.completed_tasks / cl.total_tasks) * 100);
  }

  return { rows, clients, canManage, isBroad };
}

// ---------------------------------------------------------------------------
// Drawer / grid mutations (reused by TaskDrawer + MasterBoard)
// ---------------------------------------------------------------------------

async function requireAuth() {
  const session = await getSession();
  return session;
}

async function taskOf(taskId: string) {
  const t = (
    await query<{ project_id: string; assigned_to: string | null }>(
      `SELECT project_id, assigned_to FROM tasks WHERE id = $1`,
      [taskId]
    )
  )[0];
  return t || null;
}

export async function updateMasterTaskOverviewAction(
  taskId: string,
  input: { title?: string; description?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const sets: string[] = [];
  const args: unknown[] = [];
  const push = (col: string, val: unknown) => {
    args.push(val);
    sets.push(`${col} = $${args.length}`);
  };
  if (input.title != null) {
    const title = String(input.title).trim();
    if (title.length < 2) return { ok: false, error: "Title is too short." };
    push("title", title.slice(0, 240));
  }
  if (input.description !== undefined) {
    const desc = input.description == null ? null : sanitizeRich(String(input.description));
    push("description", desc);
  }
  if (sets.length === 0) return { ok: false, error: "Nothing to update." };
  args.push(taskId);
  await query(`UPDATE tasks SET ${sets.join(", ")} WHERE id = $${args.length}`, args);
  revalidatePath("/projects");
  return { ok: true };
}

export async function setMasterTaskDeadlineAction(
  taskId: string,
  date: string | null
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  await setTaskDeadline(taskId, date);
  revalidatePath("/projects");
  return { ok: true };
}

export async function saveMasterTaskRemarksAction(
  taskId: string,
  remarks: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  await query(`UPDATE tasks SET remarks = $1 WHERE id = $2`, [sanitizeRich(remarks), taskId]);
  revalidatePath("/projects");
  return { ok: true };
}

export async function completeMasterTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session) return { ok: false, error: "Not authorized." };
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  const isAssignee = task.assigned_to === session.sub;
  if (!isAssignee && !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  await markTaskComplete(taskId);
  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteMasterTaskAction(
  taskId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_PROJECTS_DELETE)) {
    return { ok: false, error: "Not authorized." };
  }
  await query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
  revalidatePath("/projects");
  return { ok: true };
}

export async function setMasterTaskTeamAction(
  taskId: string,
  memberIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_TASKS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const task = await taskOf(taskId);
  if (!task) return { ok: false, error: "Task not found." };
  if (Array.isArray(memberIds) && memberIds.length > 0) {
    await setTaskTeam(taskId, memberIds);
  }
  revalidatePath("/projects");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client Shared Dashboards — restricted magic-link tokens (Part 6)
// ---------------------------------------------------------------------------

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

export async function createClientShareAction(
  clientId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_PROJECTS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const client = (
    await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1`, [clientId])
  )[0];
  if (!client) return { ok: false, error: "Client not found." };

  const existing = (
    await query<{ token: string }>(
      `SELECT token FROM client_shares WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    )
  )[0];
  const token = existing?.token || generateToken();
  if (!existing) {
    await query(
      `INSERT INTO client_shares (client_id, token, created_by) VALUES ($1, $2, $3)`,
      [clientId, token, session.sub]
    );
  }
  revalidatePath("/projects");
  return { ok: true, url: `/shared/${token}` };
}

export async function getClientShareUrlAction(
  clientId: string
): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_PROJECTS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  const row = (
    await query<{ token: string }>(
      `SELECT token FROM client_shares WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [clientId]
    )
  )[0];
  return { ok: true, url: row?.token ? `/shared/${row.token}` : null };
}

export async function revokeClientShareAction(
  clientId: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAuth();
  if (!session || !hasPermission(session.permissions, PERM_PROJECTS_MANAGE)) {
    return { ok: false, error: "Not authorized." };
  }
  await query(`DELETE FROM client_shares WHERE client_id = $1`, [clientId]);
  revalidatePath("/projects");
  return { ok: true };
}

// -- Serve the restricted client view (public route, renderer ignores privacy)

export async function getSharedBoardRowsAction(token: string): Promise<MasterRow[]> {
  const row = (
    await query<{ client_id: string }>(
      `SELECT client_id FROM client_shares WHERE token = $1`,
      [token]
    )
  )[0];
  if (!row) return [];
  await query(`UPDATE client_shares SET last_accessed_at = now() WHERE token = $1`, [token]);
  return query<MasterRow>(
    `SELECT t.id, c.id AS client_id, c.name AS client_name, c.company AS client_company,
            p.id AS project_id, p.name AS project_name,
            t.group_key, t.step_key, t.sequence, t.title, t.description, t.status, t.priority,
            t.assigned_to, u.full_name AS assignee_name, r.label AS role_label,
            t.due_date::text AS due_date,
            (t.status = 'completed') AS completed,
            false AS overdue,
            NULL AS remarks, t.created_at::text AS created_at, t.completed_at::text AS completed_at
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN clients c ON c.id = p.client_id
     LEFT JOIN users u ON u.id = t.assigned_to
     LEFT JOIN roles r ON r.key = t.role_key
     WHERE c.id = $1
     ORDER BY p.name ASC, t.created_at DESC`,
    [row.client_id]
  );
}

export async function getSharedClientMetaAction(token: string): Promise<{
  client_id: string;
  client_name: string;
  client_company: string | null;
} | null> {
  const row = await query<{
    client_id: string;
    client_name: string;
    client_company: string | null;
  }>(
    `SELECT cs.client_id, c.name AS client_name, c.company AS client_company
     FROM client_shares cs
     JOIN clients c ON c.id = cs.client_id
     WHERE cs.token = $1`,
    [token]
  );
  return row[0] || null;
}
