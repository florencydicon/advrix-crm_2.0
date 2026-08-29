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
 * Generates the UNIFIED sequential tasks for every deliverable item on a
 * project (e.g. "Static Post 01", "Reel 01", ...).
 *
 * A deliverable is one task block — NOT split into content "_c_" + visual "_v_"
 * sub-tasks. Each task starts as `pending_approval` (brief awaiting approval,
 * no members yet). Once a PM approves the brief it becomes `approved` and the
 * sequence is auto-filled from the project team order; the task then travels
 * through each member (start → submit → gate approval → handoff) and completes
 * automatically after the final approval.
 */
export async function generateDeliverableTasks(projectId: string) {
  try {
    const deliverables = await query<DeliverableRow>(
      `SELECT * FROM project_deliverables WHERE project_id = $1 ORDER BY created_at`,
      [projectId]
    );
    if (deliverables.length === 0) return;

    for (const d of deliverables) {
      const label = d.is_custom && d.custom_label ? d.custom_label : d.category_label;
      for (let i = 1; i <= d.quantity; i++) {
        const stepKey = `${d.category_key}_d_${i}`;
        const title = `${label} ${pad(i)}`;
        const existing = await query<{ id: string }>(
          `SELECT id FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
          [projectId, stepKey]
        );
        if (existing.length > 0) continue;
        await query(
          `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, content, status, priority, assigned_to, created_by)
           VALUES ($1, $2, $3, NULL, $4, 1, $5, $6, NULL, 'pending_approval', 'medium', NULL, NULL)`,
          [
            projectId,
            stepKey,
            d.category_key,
            d.id,
            title,
            `Unified deliverable "${title}". This task flows sequentially through the assigned team — each member starts, submits, and is approved before the next hand-off.`,
          ]
        );
      }
    }

    // Any task already past brief approval picks up the current team order.
    await syncApprovedTaskSequences(projectId);
    await maybeCompleteProject(projectId);
  } catch (err) {
    console.error("generateDeliverableTasks failed for project", projectId, ":", err);
  }
}

// ---------- Unified sequential workflow (Steps 1–5) ----------

/** Ordered project team member ids (position asc, legacy fallback by created_at). */
export async function getProjectTeamOrder(projectId: string): Promise<string[]> {
  try {
    const rows = await query<{ user_id: string }>(
      `SELECT user_id FROM assignments WHERE project_id = $1 ORDER BY position ASC, created_at ASC`,
      [projectId]
    );
    return rows.map((r) => r.user_id);
  } catch {
    const rows = await query<{ user_id: string }>(
      `SELECT user_id FROM assignments WHERE project_id = $1 ORDER BY created_at ASC`,
      [projectId]
    );
    return rows.map((r) => r.user_id);
  }
}

async function roleKeyOf(userId: string): Promise<string | null> {
  const rows = await query<{ role_key: string }>(
    `SELECT r.key AS role_key FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [userId]
  );
  return rows[0]?.role_key ?? null;
}

/** The given member's assignment deadline on the project (for stage due-dates). */
async function assignmentDeadlineOf(
  projectId: string,
  userId: string,
  roleKey: string | null
): Promise<string | null> {
  const rows = await query<{ allotment_deadline: string | null }>(
    `SELECT allotment_deadline::text AS allotment_deadline
     FROM assignments
     WHERE project_id = $1 AND user_id = $2 AND ($3::text IS NULL OR role_key = $3)
     ORDER BY position ASC LIMIT 1`,
    [projectId, userId, roleKey]
  );
  return rows[0]?.allotment_deadline ?? null;
}

/**
 * Step 3 — Team Allotment. Sets the sequential team for one task in the exact
 * order the PM provides. Replaces membership, rewrites positions, and points
 * the task at the first member. Does NOT change the task status.
 */
export async function setTaskTeam(taskId: string, memberIds: string[]) {
  if (!Array.isArray(memberIds) || memberIds.length === 0) return;
  const task = (
    await query<{ project_id: string }>(`SELECT project_id FROM tasks WHERE id = $1`, [taskId])
  )[0];
  if (!task) return;
  const roles = new Map<string, string>();
  await query(`DELETE FROM task_assignees WHERE task_id = $1`, [taskId]);
  for (let i = 0; i < memberIds.length; i++) {
    const uid = memberIds[i];
    roles.set(uid, (await roleKeyOf(uid)) || "");
    await query(
      `INSERT INTO task_assignees (task_id, user_id, position) VALUES ($1, $2, $3)`,
      [taskId, uid, i]
    );
  }
  const first = memberIds[0];
  const firstRole = roles.get(first) || null;
  const deadline = await assignmentDeadlineOf(task.project_id, first, firstRole);
  await query(
    `UPDATE tasks SET assigned_to = $2, role_key = $3, current_step = 0, due_date = COALESCE($4, due_date)
     WHERE id = $1`,
    [taskId, first, firstRole, deadline]
  );
}

/**
 * Auto-fills the sequence of a freshly-approved task from the project team
 * order. No-op while the brief is still awaiting approval.
 */
export async function autoAllotTaskTeam(taskId: string, projectId: string) {
  const members = await getProjectTeamOrder(projectId);
  if (members.length === 0) return;
  const task = (
    await query<{ status: string }>(`SELECT status FROM tasks WHERE id = $1`, [taskId])
  )[0];
  if (!task || task.status !== "approved") return;
  await setTaskTeam(taskId, members);
}

/**
 * Rebuilds the sequence of every approved (brief OK, not started) task in a
 * project to match the project team order. Called when the PM edits the team.
 */
export async function syncApprovedTaskSequences(projectId: string) {
  const members = await getProjectTeamOrder(projectId);
  if (members.length === 0) return;
  const tasks = await query<{ id: string }>(
    `SELECT id FROM tasks WHERE project_id = $1 AND status = 'approved'`,
    [projectId]
  );
  for (const t of tasks) await setTaskTeam(t.id, members);
}

/**
 * Step 4/5 — advances a task to the next member after a gate approval, or
 * completes it after the final member's approval. Returns the next member's id,
 * or null when the task is now completed.
 */
export async function advanceTaskStep(taskId: string): Promise<string | null> {
  const task = (
    await query<{ project_id: string; current_step: number }>(
      `SELECT project_id, current_step FROM tasks WHERE id = $1`,
      [taskId]
    )
  )[0];
  if (!task) return null;
  const seq = await query<{ user_id: string | null; role_key: string | null }>(
    `SELECT ta.user_id, r.key AS role_key
     FROM task_assignees ta
     LEFT JOIN users u ON u.id = ta.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE ta.task_id = $1
     ORDER BY ta.position ASC, ta.added_at ASC`,
    [taskId]
  );
  const nextIdx = (task.current_step ?? 0) + 1;
  const next = seq[nextIdx];
  if (next?.user_id) {
    const deadline = await assignmentDeadlineOf(task.project_id, next.user_id, next.role_key);
    await query(
      `UPDATE tasks SET current_step = $2, assigned_to = $3, role_key = $4, status = 'approved',
       due_date = COALESCE($5, due_date), reviewed_at = NULL
       WHERE id = $1`,
      [taskId, nextIdx, next.user_id, next.role_key, deadline]
    );
    return next.user_id;
  }
  await query(`UPDATE tasks SET status = 'completed', completed_at = now() WHERE id = $1`, [taskId]);
  await maybeCompleteProject(task.project_id);
  return null;
}

/**
 * Manual completion override (Admin/PM only) — force-closes a unified task at
 * any point in the sequence.
 */
export async function markTaskComplete(taskId: string) {
  await query(`UPDATE tasks SET status = 'completed', completed_at = now() WHERE id = $1`, [taskId]);
  const task = (
    await query<{ project_id: string }>(`SELECT project_id FROM tasks WHERE id = $1`, [taskId])
  )[0];
  if (task) await maybeCompleteProject(task.project_id);
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
    if (!task) {
      await maybeCompleteProject(projectId);
      return;
    }
    // Unified sequential tasks (_d_) have no downstream visual sub-task to
    // create — the sequence is handled by advanceTaskStep / reviewTaskAction.
    if (task.step_key && task.step_key.includes("_d_")) {
      await maybeCompleteProject(projectId);
      return;
    }
    // If this is already a visual task (step_key contains _v_) or not sequence 1,
    // there is no downstream visual task to create — just check project completion.
    if (task.step_key.includes("_v_") || task.sequence !== 1) {
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
        let alloc: { user_id: string }[] = [];
        try {
          alloc = await query<{ user_id: string }>(
            `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = $2 ORDER BY position ASC LIMIT 1`,
            [projectId, visualRole]
          );
        } catch {
          alloc = await query<{ user_id: string }>(
            `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = $2 LIMIT 1`,
            [projectId, visualRole]
          );
        }
        // Content-title swap: if Writer provided content (e.g., "Premium Living, Premium Interior"),
        // the next visual task title becomes that content so Designer/Editor sees the actual copy as task name.
        const rawContent = (task.content || "").split("\n")[0].trim();
        const visualTitle = rawContent.length >= 3 ? rawContent.slice(0, 80) : `${task.title.replace(/— Content & Copy\s*$/, "").trim()} — Visual`;
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
            visualTitle,
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
  let alloc: { user_id: string }[] = [];
  try {
    alloc = await query<{ user_id: string }>(
      `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = 'SMM' ORDER BY position ASC LIMIT 1`,
      [projectId]
    );
  } catch {
    alloc = await query<{ user_id: string }>(
      `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = 'SMM' LIMIT 1`,
      [projectId]
    );
  }
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
  let alloc: { user_id: string }[] = [];
  try {
    alloc = await query<{ user_id: string }>(
      `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = $2 ORDER BY position ASC LIMIT 1`,
      [projectId, visualRole]
    );
  } catch {
    alloc = await query<{ user_id: string }>(
      `SELECT user_id FROM assignments WHERE project_id = $1 AND role_key = $2 LIMIT 1`,
      [projectId, visualRole]
    );
  }
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
  // Ensure position column exists (handles production DB that hasn't run migration 015 yet)
  try { await query(`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0`); } catch {}
  // Priority ordering: allocations array order is the priority (top = first assigned).
  // This removes fixed Writer->Designer flow — auto-chain now follows this order.
  for (let idx = 0; idx < allocations.length; idx++) {
    const a = allocations[idx];
    if (!a.user_id) continue;
    try {
      await query(
        `INSERT INTO assignments (user_id, project_id, role_key, allotment_deadline, position)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, project_id, role_key)
         DO UPDATE SET allotment_deadline = EXCLUDED.allotment_deadline, position = EXCLUDED.position`,
        [a.user_id, projectId, a.role_key, a.deadline || null, idx]
      );
    } catch {
      // Fallback if position column still missing (older DB)
      await query(
        `INSERT INTO assignments (user_id, project_id, role_key, allotment_deadline)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, project_id, role_key)
         DO UPDATE SET allotment_deadline = EXCLUDED.allotment_deadline`,
        [a.user_id, projectId, a.role_key, a.deadline || null]
      );
    }
    await allocateTasksForRole(projectId, a.role_key, a.user_id);
    await ensureVisualTasksForAllocation(projectId, a.role_key, a.user_id);
  }
}

async function ensureVisualTasksForAllocation(projectId: string, roleKey: string, userId: string) {
  try {
    // Live DB patch: ensure deliverable_types support all 3 scenarios (1→2→5, 1→3→5, 1→4) + single-role direct
    // video_shoot and video_edit are WRITER->visual so Writer→Videographer/Editor chains work;
    // single-role direct when no Writer allocated is healed via orphan deletion below.
    await query(`UPDATE deliverable_types SET content_role = 'WRITER' WHERE key IN ('video_shoot','video_edit') AND content_role IS DISTINCT FROM 'WRITER'`);
    await query(`INSERT INTO deliverable_types (key, label, content_role, visual_role, default_qty, sort) VALUES ('design_asset','Design Asset',NULL,'DESIGNER',1,80) ON CONFLICT (key) DO NOTHING`);
    // Heal mismatched visual roles (e.g., Video Shoot visual showing as Video Editor) from pre-migration data.
    await query(`UPDATE tasks SET role_key = 'VIDEOGRAPHER' WHERE group_key = 'video_shoot' AND step_key LIKE '%_v_%' AND role_key != 'VIDEOGRAPHER'`);
    await query(`UPDATE tasks SET role_key = 'EDITOR' WHERE group_key = 'video_edit' AND step_key LIKE '%_v_%' AND role_key != 'EDITOR'`);
    await query(`UPDATE tasks SET role_key = 'DESIGNER' WHERE group_key = 'design_asset' AND step_key LIKE '%_v_%' AND role_key != 'DESIGNER'`);
    // Backfill old Writer tasks that were completed before title-swap fix: rename generic "Static Post 01 — Content & Copy" to actual content first line
    try {
      await query(`UPDATE tasks SET title = LEFT(TRIM(SPLIT_PART(content, E'\n', 1)), 80) WHERE role_key='WRITER' AND title LIKE '% — Content & Copy' AND content IS NOT NULL AND LENGTH(TRIM(content)) >=3`);
    } catch {}
    const deliverables = await query<DeliverableRow>(
      `SELECT * FROM project_deliverables WHERE project_id = $1 ORDER BY created_at`,
      [projectId]
    );
    if (deliverables.length === 0) return;
    const types = await query<DeliverableTypeRow>(`SELECT key, content_role, visual_role FROM deliverable_types`);
    const typeMap = new Map(types.map((t) => [t.key, t]));
    // Fix orphan Writer tasks for any WRITER→visual deliverable (Banner, Reel, Static Post, etc.)
    // when no WRITER is allocated on this project. The pending Writer "Content & Copy"
    // placeholder is stale — convert it to the correct visual role so the yellow pill shows
    // Designer/Editor/Videographer instead of Content Writer, and tasks are assigned directly.
    const hasWriterAlloc = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM assignments WHERE project_id = $1 AND role_key = 'WRITER'`, [projectId]))[0];
    const writerCount = Number(hasWriterAlloc?.c ?? 0);
    if (writerCount === 0) {
      for (const d of deliverables) {
        const t = typeMap.get(d.category_key);
        if (!t || t.content_role !== 'WRITER' || !t.visual_role) continue;
        const label = d.is_custom && d.custom_label ? d.custom_label : d.category_label;
        const targetRole = t.visual_role;
        for (let i = 1; i <= d.quantity; i++) {
          const contentStepKey = `${d.category_key}_c_${i}`;
          const rows = await query<{ id: string; role_key: string; assigned_to: string | null; status: string }>(
            `SELECT id, role_key, assigned_to, status FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
            [projectId, contentStepKey]
          );
          if (rows[0] && rows[0].role_key === 'WRITER' && !rows[0].assigned_to && rows[0].status === 'pending') {
            const visualStepKey = `${d.category_key}_v_${i}`;
            // Avoid duplicate if visual already exists for this index
            const vExists = await query<{ id: string }>(`SELECT id FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`, [projectId, visualStepKey]);
            if (vExists.length > 0) {
              // Visual already exists — just delete the stale Writer placeholder
              await query(`DELETE FROM tasks WHERE id = $1`, [rows[0].id]);
            } else {
              await query(
                `UPDATE tasks SET role_key = $2, step_key = $3, title = $4, description = $5 WHERE id = $1`,
                [rows[0].id, targetRole, visualStepKey, `${label} ${pad(i)} — Visual`, `Produce the visual asset for "${label} ${pad(i)}".`]
              );
              // If the current allocation matches the target role, assign it immediately
              if (targetRole === roleKey) {
                await query(`INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [rows[0].id, userId]);
                await query(`UPDATE tasks SET assigned_to = COALESCE(assigned_to, $2) WHERE id = $1`, [rows[0].id, userId]);
              }
            }
          }
        }
      }
    }
    for (const d of deliverables) {
      const type = typeMap.get(d.category_key);
      if (!type) continue;
      // Only act when the allocated role matches the visual role for this deliverable.
      // Custom deliverables default visual to DESIGNER.
      let visualRole: string | null = null;
      if (d.is_custom) visualRole = "DESIGNER";
      else visualRole = type.visual_role;
      if (visualRole !== roleKey) continue;
      const label = d.is_custom && d.custom_label ? d.custom_label : d.category_label;
      for (let i = 1; i <= d.quantity; i++) {
        const visualStepKey = `${d.category_key}_v_${i}`;
        const title = `${label} ${pad(i)}`;
        const exists = await query<{ id: string }>(
          `SELECT id FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
          [projectId, visualStepKey]
        );
        if (exists.length > 0) {
          // Already exists — ensure assignee present
          await query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [exists[0].id, userId]
          );
          await query(
            `UPDATE tasks SET assigned_to = COALESCE(assigned_to, $2) WHERE id = $1 AND status <> 'completed'`,
            [exists[0].id, userId]
          );
          continue;
        }
        // Create visual task immediately (sequence 2 if content exists, else 1)
        const contentStepKey = `${d.category_key}_c_${i}`;
        const contentExists = await query<{ id: string; content: string | null }>(
          `SELECT id, content FROM tasks WHERE project_id = $1 AND step_key = $2 LIMIT 1`,
          [projectId, contentStepKey]
        );
        const seq = contentExists.length > 0 ? 2 : 1;
        const briefCopy = contentExists[0]?.content ?? null;
        const desc = seq === 2 ? `Visual production for "${title} — Content & Copy". Use the approved copy as reference.` : `Produce the visual asset for "${title}".`;
        const inserted = await query<{ id: string }>(
          `INSERT INTO tasks (project_id, step_key, group_key, role_key, deliverable_id, sequence, title, description, brief_copy, status, priority, assigned_to, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'medium', $10, NULL) RETURNING id`,
          [projectId, visualStepKey, d.category_key, visualRole, d.id, seq, `${title} — Visual`, desc, briefCopy, userId]
        );
        if (inserted[0]?.id) {
          await query(
            `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [inserted[0].id, userId]
          );
        }
      }
    }
  } catch (err) {
    console.error("ensureVisualTasksForAllocation failed for project", projectId, "role", roleKey, ":", err);
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
