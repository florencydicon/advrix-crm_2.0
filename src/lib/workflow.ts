import { query } from "@/lib/db";
import type { RoleKey } from "@/lib/types";

interface WorkflowStepRow {
  id: string;
  step_key: string;
  group_key: string;
  name: string;
  target_role: string;
  title_template: string;
  description_template: string;
  await: string;
  sequence: number;
  active: boolean;
}

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
 * Core automation engine for pipeline (workflow_steps) projects.
 * Called after any task status change and after PM approval.
 * Idempotently cascades: creates every workflow task whose prerequisite groups
 * are complete and whose task does not exist yet. Loops until stable.
 */
export async function runWorkflow(projectId: string) {
  const steps = await query<WorkflowStepRow>(
    `SELECT * FROM workflow_steps WHERE active = true ORDER BY sequence, id`
  );

  const assigneeCache = new Map<string, string | null>();

  for (let pass = 0; pass < steps.length + 2; pass++) {
    const groups = await query<TaskRow>(
      `SELECT id, step_key, status FROM tasks WHERE project_id = $1`,
      [projectId]
    );

    const byStep = new Map<string, TaskRow[]>();
    for (const t of groups) {
      const arr = byStep.get(t.step_key) || [];
      arr.push(t);
      byStep.set(t.step_key, arr);
    }

    const groupStatus = new Map<string, { created: boolean; completed: boolean }>();
    for (const s of steps) {
      const g = s.group_key;
      const tasksInGroup = steps
        .filter((x) => x.group_key === g)
        .flatMap((x) => byStep.get(x.step_key) || []);
      const created = tasksInGroup.length > 0;
      const completed = created && tasksInGroup.every((t) => t.status === "completed");
      groupStatus.set(g, { created, completed });
    }

    let changed = false;

    for (const s of steps) {
      if ((byStep.get(s.step_key) || []).length > 0) continue;

      const prereqs = s.await.split(",").map((x) => x.trim()).filter(Boolean);
      const ready = prereqs.every((g) => groupStatus.get(g)?.completed === true);
      if (!ready) continue;

      if (!assigneeCache.has(s.target_role)) {
        assigneeCache.set(s.target_role, await assigneeForRole(s.target_role));
      }

      await query(
        `INSERT INTO tasks (project_id, step_key, group_key, role_key, title, description, status, priority, assigned_to, created_by, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'medium', $7, NULL, NULL)`,
        [
          projectId,
          s.step_key,
          s.group_key,
          s.target_role,
          s.title_template,
          s.description_template,
          assigneeCache.get(s.target_role),
        ]
      );
      changed = true;
    }

    if (!changed) break;
  }

  await maybeCompleteProject(projectId);
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
    await query<{ id: string; deliverable_id: string; group_key: string; title: string; step_key: string; sequence: number }>(
      `SELECT id, deliverable_id, group_key, title, step_key, sequence FROM tasks WHERE id = $1 AND deliverable_id IS NOT NULL`,
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
        `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, content, status, priority, assigned_to, created_by)
         VALUES ($1, $2, $3, $4, $5, 2, $6, $7, $8, 'pending', 'medium', $9, NULL)`,
        [
          projectId,
          visualStepKey,
          task.group_key,
          visualRole,
          task.deliverable_id,
          `${task.title.replace(/— Content & Copy\s*$/, "").trim()} — Visual`,
          `Visual production for "${task.title}". Use the approved copy and content brief as reference.`,
          task.title,
          alloc[0]?.user_id ?? null,
        ]
      );
    }
  }

  await maybeCompleteProject(projectId);
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
