import { query } from "@/lib/db";
import type { RoleKey } from "@/lib/types";

interface TaskRow {
  id: string;
  step_key: string;
  status: string;
}

interface DeliverableRow {
  id: string;
  project_id: string;
  category_key: string;
  category_label: string;
  quantity: number;
  is_custom: boolean;
  custom_label: string | null;
}

interface DeliverableTypeRow {
  key: string;
  content_role: string | null;
  visual_role: string | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Replaces role placeholders in a template. */
function fillTemplate(template: string, item: number, label: string) {
  return template
    .replaceAll("{N}", pad(item))
    .replaceAll("{n}", String(item))
    .replaceAll("{label}", label);
}

async function assigneeForRole(roleKey: string): Promise<string | null> {
  const rows = await query<{ id: string }>(
    `SELECT u.id FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.key = $1 AND u.is_active = true
     ORDER BY u.created_at ASC LIMIT 1`,
    [roleKey]
  );
  return rows[0]?.id ?? null;
}

async function allocateTasksForRole(projectId: string, roleKey: string, userId: string | null) {
  if (!userId) return;
  // Multi-assignee: every open task of this role gains this member
  // without ever removing members allotted previously.
  await query(
    `INSERT INTO task_assignees (task_id, user_id)
     SELECT t.id, $3 FROM tasks t
     WHERE t.project_id = $1 AND t.role_key = $2 AND t.status <> 'completed'
     ON CONFLICT (task_id, user_id) DO NOTHING`,
    [projectId, roleKey, userId]
  );
  // Primary assignee only fills empty slots — no overwriting.
  await query(
    `UPDATE tasks SET assigned_to = $3
     WHERE project_id = $1 AND role_key = $2 AND status <> 'completed' AND assigned_to IS NULL`,
    [projectId, roleKey, userId]
  );
}

/**
 * Legacy workflow runner - now a no-op since we use deliverables-based workflow.
 * Kept for backwards compatibility with existing action calls.
 */
export async function runWorkflow(_projectId: string) {
  // No-op: deliverables-based workflow handles task generation via generateDeliverableTasks
}

/**
 * Generates the individual content tasks for every deliverable item on a
 * project (e.g. "Static Post 01", "Static Post 02", "Reel 01", ...). Visual
 * tasks are created later, when the corresponding content task is completed.
 */
export async function generateDeliverableTasks(projectId: string) {
  try {
    const deliverables = await query<DeliverableRow>(
      `SELECT * FROM project_deliverables WHERE project_id = $1 ORDER BY created_at`,
      [projectId]
    );
    if (deliverables.length === 0) return;

    const types = await query<DeliverableTypeRow>(`SELECT key, content_role, visual_role FROM deliverable_types`);

    for (const d of deliverables) {
      const type = types.find((t) => t.key === d.category_key);
      const label = d.is_custom && d.custom_label ? d.custom_label : d.category_label;
      const contentRole: RoleKey | null = d.is_custom ? null : (type?.content_role as RoleKey | null) || null;

      for (let i = 1; i <= d.quantity; i++) {
        const title = `${label} ${pad(i)}`;
        const contentStepKey = `${d.category_key}_c_${i}`;
        if (contentRole) {
          const existing = await query<{ id: string }>(
            `SELECT id FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
            [projectId, contentStepKey]
          );
          if (existing.length > 0) continue;

          await query(
            `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, content, status, priority, assigned_to, created_by)
             VALUES ($1, $2, $3, $4, $5, 1, $6, $7, NULL, 'pending', 'medium', NULL, NULL)`,
            [
              projectId,
              contentStepKey,
              d.category_key,
              contentRole,
              d.id,
              `${title} — Content & Copy`,
              `Draft the copy, captions and script for "${title}". Final copy must be brand-aligned before visual production begins.`,
            ]
          );
        } else {
          const visualRole: RoleKey | null = d.is_custom ? "DESIGNER" : (type?.visual_role as RoleKey | null) || null;
          if (visualRole) {
            const visualStepKey = `${d.category_key}_v_${i}`;
            const existing = await query<{ id: string }>(
              `SELECT id FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
              [projectId, visualStepKey]
            );
            if (existing.length > 0) continue;

            await query(
              `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, content, status, priority, assigned_to, created_by)
               VALUES ($1, $2, $3, $4, $5, 2, $6, $7, NULL, 'pending', 'medium', NULL, NULL)`,
              [
                projectId,
                visualStepKey,
                d.category_key,
                visualRole,
                d.id,
                `${title} — Visual`,
                `Produce the visual asset for "${title}".`,
              ]
            );
          }
        }
      }
    }

    const allocations = await query<{ role_key: string; user_id: string }>(
      `SELECT role_key, user_id FROM assignments WHERE project_id = $1`,
      [projectId]
    );
    for (const a of allocations) {
      await allocateTasksForRole(projectId, a.role_key, a.user_id);
    }

    await maybeCompleteProject(projectId);
  } catch (err) {
    console.error("generateDeliverableTasks failed for project", projectId, ":", err);
  }
}

/**
 * Fired when a task moves to completed. If it is a content task for a
 * deliverable, creates (and auto-assigns) the matching visual task so the work
 * transitions to the Designer / Video Editor automatically.
 */
export async function handleDeliverableTaskCompleted(projectId: string, taskId: string) {
  try {
    const task = (
      await query<{ id: string; deliverable_id: string; group_key: string; title: string; step_key: string; sequence: number; content: string | null }>(
        `SELECT id, deliverable_id, group_key, title, step_key, sequence, content FROM tasks WHERE id = $1 AND deliverable_id IS NOT NULL`,
        [taskId]
      )
    )[0];
    if (!task || task.sequence !== 1) {
      await maybeCompleteProject(projectId);
      return;
    }

    const d = (
      await query<DeliverableRow>(
        `SELECT * FROM project_deliverables WHERE id = $1`,
        [task.deliverable_id]
      )
    )[0];

    let visualRole: RoleKey | null = null;
    if (d) {
      if (d.is_custom) {
        visualRole = "DESIGNER";
      } else {
        const type = (
          await query<DeliverableTypeRow>(
            `SELECT key, content_role, visual_role FROM deliverable_types WHERE key = $1`,
            [d.category_key]
          )
        )[0];
        visualRole = (type?.visual_role as RoleKey | null) || null;
      }
    }

    if (visualRole) {
      const visualStepKey = task.step_key.replace(/_c_\d+$/, "") + "_v_" + (task.step_key.match(/_c_(\d+)$/)?.[1] ?? "1");
      const exists = await query<{ id: string }>(
        `SELECT id FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
        [projectId, visualStepKey]
      );
      if (exists.length === 0) {
        const alloc = await query<{ user_id: string }>(
          `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = $2 LIMIT 1`,
          [projectId, visualRole]
        );
        const inserted = await query<{ id: string }>(
          `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, brief_copy, content, status, priority, assigned_to, created_by)
           VALUES ($1, $2, $3, $4, $5, 2, $6, $7, $8, $9, 'pending', 'medium', $10, NULL)
           RETURNING id`,
          [
            projectId,
            visualStepKey,
            task.group_key,
            visualRole,
            task.deliverable_id,
            `${task.title.replace(/— Content & Copy\s*$/, "").trim()} — Visual`,
            `Visual production for "${task.title}". Use the approved copy as reference.`,
            task.content,
            task.title,
            alloc[0]?.user_id ?? null,
          ]
        );
        if (inserted[0]?.id && alloc[0]?.user_id) {
          await query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [inserted[0].id, alloc[0].user_id]
          );
        }
      }
    }

    await maybeCompleteProject(projectId);
  } catch (err) {
    console.error("handleDeliverableTaskCompleted failed for project", projectId, "task", taskId, ":", err);
  }
}

/**
 * Auto-routes an approved visual task to the project's Social Media Manager so
 * they can take it to the client for approval. Falls back to notifying SMMs if
 * no SMM is allocated on the project.
 */
export async function handoffVisualTaskToSmm(projectId: string, taskId: string): Promise<string | null> {
  const alloc = await query<{ user_id: string }>(
    `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = 'SMM' LIMIT 1`,
    [projectId]
  );
  const smmId = alloc[0]?.user_id ?? null;
  if (!smmId) return null;
  await query(
    `UPDATE tasks SET assigned_to = $2, status = 'client_review', reviewed_at = now()
     WHERE id = $1`,
    [taskId, smmId]
  );
  return smmId;
}

/**
 * Routes a visual task back to the Design / Edit team after client feedback.
 */
export async function routeVisualTaskToProducer(projectId: string, taskId: string, visualRole: string): Promise<string | null> {
  const alloc = await query<{ user_id: string }>(
    `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = $2 LIMIT 1`,
    [projectId, visualRole]
  );
  const userId = alloc[0]?.user_id ?? null;
  if (!userId) return null;
  await query(
    `UPDATE tasks SET assigned_to = $2, status = 'client_feedback', reviewed_at = now()
     WHERE id = $1`,
    [taskId, userId]
  );
  return userId;
}

/**
 * Allocates the project team. A single member may be assigned multiple roles on
 * the same project (multi-role). Re-assigns open tasks of each role to the
 * allocated member automatically.
 */
export async function allocateProjectTeam(
  projectId: string,
  allocations: { role_key: string; user_id: string | null; deadline?: string | null }[]
) {
  // Additive sync: never wipe existing allocations (multiple members per
  // role are supported); upsert deadline per member.
  for (const a of allocations) {
    if (!a.user_id) continue;
    await query(
      `INSERT INTO assignments (user_id, project_id, role_key, allotment_deadline)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, project_id, role_key)
       DO UPDATE SET allotment_deadline = EXCLUDED.allotment_deadline`,
      [a.user_id, projectId, a.role_key, a.deadline || null]
    );
    await allocateTasksForRole(projectId, a.role_key, a.user_id);
  }
}

async function maybeCompleteProject(projectId: string) {
  const open = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = $1 AND status <> 'completed'`,
    [projectId]
  );
  const openTasks = Number(open[0]?.c ?? 1);
  const hasTasks = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM tasks WHERE project_id = $1`,
    [projectId]
  );
  const total = Number(hasTasks[0]?.c ?? 0);

  if (total > 0 && openTasks === 0) {
    await query(`UPDATE projects SET status = 'completed' WHERE id = $1`, [projectId]);
  }
}

// ---------- Deadline engine (Sundays excluded) ----------

/** Adds `days` working days to a date, skipping Sundays. */
export function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start.getTime());
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) remaining -= 1;
  }
  return d;
}

/** Counts the number of working days (Sundays excluded) between two dates. */
function countWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from.getTime());
  while (d < to) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) count += 1;
  }
  return Math.max(0, count);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Assigns sequential working-day due dates to every task of a project that
 * doesn't have one yet. Sundays are excluded. Each stage gets 2 working days;
 * if the project has an overall deadline the tasks are spread evenly across
 * the available working days instead.
 */
export async function computeSequentialDeadlines(projectId: string) {
  try {
    const tasks = await query<{ id: string; due_date: string | null }>(
      `SELECT id, due_date::text AS due_date FROM tasks WHERE project_id = $1 ORDER BY created_at ASC, id ASC`,
      [projectId]
    );
    if (tasks.length === 0) return;

    const project = (
      await query<{ deadline: string | null }>(
        `SELECT deadline::text AS deadline FROM projects WHERE id = $1`,
        [projectId]
      )
    )[0];

    const start = new Date();
    start.setHours(12, 0, 0, 0);

    const missing = tasks.filter((t) => !t.due_date);
    if (missing.length === 0) return;

    let dates: Date[] = [];
    const totalTasks = tasks.length;
    const deadlineStr = project?.deadline || null;

    if (deadlineStr) {
      const end = new Date(`${deadlineStr}T12:00:00`);
      const workDays = countWorkingDays(start, end);
      const step = totalTasks > 1 ? Math.max(1, Math.floor(workDays / (totalTasks - 1))) : workDays;
      let cursor = new Date(start.getTime());
      for (let i = 0; i < totalTasks; i++) {
        cursor = addWorkingDays(cursor, i === 0 ? 1 : Math.max(1, step));
        dates.push(new Date(cursor.getTime()));
      }
      for (let i = 1; i < dates.length; i++) {
        if (dates[i] < dates[i - 1]) dates[i] = addWorkingDays(dates[i - 1], 1);
        while (dates[i].getDay() === 0) dates[i].setDate(dates[i].getDate() + 1);
      }
    } else {
      let cursor = new Date(start.getTime());
      for (let i = 0; i < totalTasks; i++) {
        cursor = addWorkingDays(cursor, 2);
        dates.push(new Date(cursor.getTime()));
      }
    }

    for (let i = 0; i < totalTasks; i++) {
      const t = tasks[i];
      if (!t.due_date) {
        await query(`UPDATE tasks SET due_date = $2 WHERE id = $1`, [t.id, toISODate(dates[i])]);
      }
    }
  } catch (err) {
    console.error("computeSequentialDeadlines failed for project", projectId, ":", err);
  }
}

/**
 * Emergency leave handling. Extends the affected member's open task deadlines
 * by N working days (Sundays excluded), records the reason on each task, and
 * cascades the same extension to every subsequent open task in the project so
 * the sequential pipeline absorbs the delay.
 */
export async function extendForLeave(
  projectId: string,
  userId: string,
  days: number,
  reason: string
) {
  const cleanDays = Math.max(0, Math.min(365, Math.floor(days)));

  // Record leave on the assignment row (preserving role_key).
  const roleRow = (
    await query<{ role_key: string }>(
      `SELECT a.role_key FROM assignments a WHERE a.project_id = $1 AND a.user_id = $2
       UNION ALL
       SELECT t.role_key FROM tasks t WHERE t.project_id = $1 AND t.assigned_to = $2
       LIMIT 1`,
      [projectId, userId]
    )
  )[0];

  if (roleRow) {
    await query(
      `INSERT INTO assignments (user_id, project_id, role_key, on_leave, leave_reason, leave_days)
       VALUES ($1, $2, $3, true, $4, $5)
       ON CONFLICT (user_id, project_id, role_key) DO UPDATE
       SET on_leave = true, leave_reason = EXCLUDED.leave_reason, leave_days = EXCLUDED.leave_days`,
      [userId, projectId, roleRow.role_key, reason || null, cleanDays]
    );
  }

  if (cleanDays === 0) return;

  const tasks = await query<{ id: string; assigned_to: string | null }>(
    `SELECT id, assigned_to FROM tasks WHERE project_id = $1 AND status <> 'completed' ORDER BY created_at ASC, id ASC`,
    [projectId]
  );

  const cascadeStartIdx = tasks.findIndex((t) => t.assigned_to === userId);
  if (cascadeStartIdx === -1) return;

  for (let i = cascadeStartIdx; i < tasks.length; i++) {
    const t = tasks[i];
    const current = (
      await query<{ due_date: string | null }>(`SELECT due_date::text AS due_date FROM tasks WHERE id = $1`, [t.id])
    )[0];
    const base = current?.due_date ? new Date(`${current.due_date}T12:00:00`) : new Date();
    base.setHours(12, 0, 0, 0);
    const next = addWorkingDays(base, cleanDays);
    const isOwner = t.assigned_to === userId;
    await query(
      `UPDATE tasks SET due_date = $2${isOwner ? `, on_leave_note = $3` : ""} WHERE id = $1`,
      isOwner ? [t.id, toISODate(next), reason || null] : [t.id, toISODate(next)]
    );
  }
}

/** Manual deadline adjustment by admins/PMs — never locked. */
export async function setTaskDeadline(taskId: string, date: string | null) {
  await query(`UPDATE tasks SET due_date = $2 WHERE id = $1`, [taskId, date || null]);
}
