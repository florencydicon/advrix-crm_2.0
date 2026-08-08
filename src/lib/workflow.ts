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
  await query(
    `UPDATE tasks SET assigned_to = $3
     WHERE project_id = $1 AND role_key = $2 AND status <> 'completed'`,
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
        // Deliverable with no content stage → create its visual task directly.
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

  // Auto-assign from any existing allocations.
  const allocations = await query<{ role_key: string; user_id: string }>(
    `SELECT role_key, user_id FROM assignments WHERE project_id = $1`,
    [projectId]
  );
  for (const a of allocations) {
    await allocateTasksForRole(projectId, a.role_key, a.user_id);
  }

  await maybeCompleteProject(projectId);
}

/**
 * Fired when a task moves to completed. If it is a content task for a
 * deliverable, creates (and auto-assigns) the matching visual task so the work
 * transitions to the Designer / Video Editor automatically.
 */
export async function handleDeliverableTaskCompleted(projectId: string, taskId: string) {
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
    // Unique per item: the content task's step_key is "<category>_c_<n>".
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
      await query(
        `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, brief_copy, content, status, priority, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, 2, $6, $7, $8, $9, 'pending', 'medium', $10, NULL)`,
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
    }
  }

  await maybeCompleteProject(projectId);
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
  allocations: { role_key: string; user_id: string | null }[]
) {
  await query(`DELETE FROM assignments WHERE project_id = $1`, [projectId]);
  for (const a of allocations) {
    if (a.user_id) {
      await query(
        `INSERT INTO assignments (user_id, project_id, role_key) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, project_id, role_key) DO NOTHING`,
        [a.user_id, projectId, a.role_key]
      );
    }
  }

  const projectRoles = await query<{ role_key: string }>(
    `SELECT DISTINCT role_key FROM tasks WHERE project_id = $1`,
    [projectId]
  );
  for (const r of projectRoles) {
    const alloc = allocations.find((a) => a.role_key === r.role_key);
    await allocateTasksForRole(projectId, r.role_key, alloc?.user_id ?? null);
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
