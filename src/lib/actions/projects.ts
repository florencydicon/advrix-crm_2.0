"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  generateDeliverableTasks,
  handleDeliverableTaskCompleted,
  allocateProjectTeam,
  handoffVisualTaskToSmm,
  routeVisualTaskToProducer,
  computeSequentialDeadlines,
  extendForLeave,
  setTaskDeadline,
} from "@/lib/workflow";
import { createNotification, getProjectCreatorId, notifyRoles } from "@/lib/notifications";
import {
  validateEmail,
  validatePhone,
  validateFullName,
  validateText,
  validateDeliverables,
} from "@/lib/validation";

// -- Deep-link helpers for notifications --------------------------------------

async function getProjectClientId(projectId: string): Promise<string | null> {
  const rows = await query<{ client_id: string }>(
    `SELECT client_id FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0]?.client_id ?? null;
}

function projectLink(clientId: string, projectId: string) {
  return `/projects/${clientId}?project=${projectId}`;
}

function taskLink(clientId: string, projectId: string, stepKey: string) {
  return `/projects/${clientId}?project=${projectId}&task=${encodeURIComponent(stepKey)}`;
}

interface DeliverableInput {
  key: string;
  label: string;
  quantity: number;
  isCustom: boolean;
  customLabel?: string | null;
}
const CAN_CREATE = ["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"];
const CAN_MANAGE = ["PROJECT_MANAGER", "SUPER_ADMIN"];

function parseDeliverables(raw: string | null): DeliverableInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d) => d && typeof d === "object")
      .map((d) => ({
        key: String(d.key || ""),
        label: String(d.label || ""),
        quantity: Number(d.quantity) || 0,
        isCustom: Boolean(d.isCustom),
        customLabel: d.customLabel != null ? String(d.customLabel) : null,
      }));
  } catch {
    return [];
  }
}

export async function createClientAction(formData: FormData) {
  const session = await getSession();
  if (!session || !CAN_CREATE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;

  const nameErr = validateFullName(name);
  if (nameErr) return { error: nameErr };
  if (email) {
    const emailErr = validateEmail(email);
    if (emailErr) return { error: emailErr };
  }
  if (phone) {
    const phoneErr = validatePhone(phone);
    if (phoneErr) return { error: phoneErr };
  }
  if (company) {
    const companyErr = validateText(company, "Company name", 2, 120);
    if (companyErr) return { error: companyErr };
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO clients (name, company, email, phone, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, company, email, phone, session.sub]
  );

  revalidatePath("/clients");
  revalidatePath("/projects");
  return { ok: true, id: rows[0].id };
}

export async function createProjectAction(formData: FormData) {
  const session = await getSession();
  if (!session || !CAN_CREATE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const client_id = String(formData.get("client_id") || "");
  const name = String(formData.get("name") || "").trim();
  const brief = String(formData.get("brief") || "").trim() || null;
  const deadline = String(formData.get("deadline") || "") || null;
  const deliverables = parseDeliverables(String(formData.get("deliverables_json") || ""));

  if (!client_id) return { error: "Client is required." };

  const clientRows = await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1`, [client_id]);
  if (!clientRows[0]) return { error: "Client not found." };

  const nameErr = validateText(name, "Project name", 3, 120);
  if (nameErr) return { error: nameErr };
  if (brief && brief.length > 2000) {
    return { error: "Task details are too long (max 2000 characters)." };
  }

  const delivErrors = validateDeliverables(deliverables);
  if (delivErrors.length > 0) return { error: delivErrors[0].message };

  const deliverableSummary =
    deliverables
      .filter((d) => d.quantity > 0)
      .map((d) => `${d.quantity} � ${d.isCustom && d.customLabel ? d.customLabel : d.label}`)
      .join(", ") || null;

  try {
    const project = await query<{ id: string }>(
      `INSERT INTO projects (client_id, name, status, brief, deliverables, deadline, created_by)
       VALUES ($1, $2, 'pending_approval', $3, $4, $5, $6) RETURNING id`,
      [client_id, name, brief, deliverableSummary, deadline, session.sub]
    );

    for (const d of deliverables.filter((x) => x.quantity > 0)) {
      await query(
        `INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [project[0].id, d.key, d.isCustom && d.customLabel ? d.customLabel : d.label, d.quantity, d.isCustom, d.customLabel]
      );
    }

    revalidatePath("/projects");
    revalidatePath("/clients");
    await notifyRoles(["PROJECT_MANAGER", "SUPER_ADMIN"], {
      type: "project",
      title: "New project awaiting approval",
      body: `${name} submitted by ${session.name}.`,
      link: projectLink(client_id, project[0].id),
    });
    return { ok: true, id: project[0].id };
  } catch (err) {
    console.error("createProjectAction failed:", err);
    return { error: "Failed to create project. Please try again." };
  }
}

export async function approveProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const project = await query<{ id: string; name: string; client_id: string }>(
    `SELECT id, name, client_id FROM projects WHERE id = $1 AND status = 'pending_approval'`,
    [projectId]
  );
  if (!project[0]) return { error: "Project not found or already processed." };

  await query(
    `UPDATE projects SET status = 'in_progress', approved_by = $2, approved_at = now()
     WHERE id = $1`,
    [projectId, session.sub]
  );

  // Deliverable-based projects generate individual tasks; others use the pipeline.
  await generateDeliverableTasks(projectId);
  await computeSequentialDeadlines(projectId);

  const creatorId = await getProjectCreatorId(projectId);
  if (creatorId) {
    await createNotification({
      userId: creatorId,
      type: "project",
      title: "Project approved",
      body: `"${project[0].name}" was approved and is now in production.`,
      link: projectLink(project[0].client_id, projectId),
    });
  }

  revalidatePath("/projects");
  return { ok: true };
}

export async function rejectProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const project = await query<{ id: string; name: string; created_by: string | null; client_id: string }>(
    `SELECT id, name, created_by, client_id FROM projects WHERE id = $1`,
    [projectId]
  );
  await query(`UPDATE projects SET status = 'rejected' WHERE id = $1`, [projectId]);

  if (project[0]?.created_by) {
    await createNotification({
      userId: project[0].created_by,
      type: "project",
      title: "Project rejected",
      body: `"${project[0]?.name ?? "Project"}" was rejected. Contact your manager for details.`,
      link: projectLink(project[0].client_id, projectId),
    });
  }
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateTaskContentAction(taskId: string, content: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const task = await query<{ assigned_to: string | null; role_key: string; title: string }>(
    `SELECT assigned_to, role_key, title FROM tasks WHERE id = $1`,
    [taskId]
  );
  if (!task[0]) return { error: "Task not found." };
  if (task[0].assigned_to !== session.sub && !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const text = String(content || "").trim();
  if (!text) return { error: "Add your work before continuing (copy, notes or asset links)." };
  if (text.length > 5000) return { error: "Content is too long (max 5000 characters)." };

  await query(`UPDATE tasks SET content = $2 WHERE id = $1`, [taskId, text]);
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  if (!CAN_MANAGE.includes(session.role_key)) {
    return { error: "Only managers can update task status directly." };
  }

  const allowed = ["pending", "in_progress", "submitted", "needs_improvement", "client_review", "client_feedback", "client_approved", "uploading", "completed"];
  if (!allowed.includes(status)) return { error: "Invalid status." };

  const taskRows = await query<{ project_id: string; deliverable_id: string | null; content: string | null; status: string; step_key: string }>(
    `SELECT t.project_id, t.deliverable_id, t.content, t.status, t.step_key
     FROM tasks t WHERE t.id = $1`,
    [taskId]
  );
  const task = taskRows[0];
  if (!task) return { error: "Task not found." };

  // Enforce workflow state machine � only valid transitions allowed
  const validTransitions: Record<string, string[]> = {
    pending: ["in_progress"],
    in_progress: ["submitted"],
    submitted: ["needs_improvement", "client_review", "completed"],
    needs_improvement: ["in_progress"],
    client_review: ["client_feedback", "client_approved"],
    client_feedback: ["in_progress"],
    client_approved: ["uploading", "completed"],
    uploading: ["completed"],
    completed: [],
  };
  const from = validTransitions[task.status];
  if (from && !from.includes(status)) {
    return { error: `Cannot move from "${task.status}" to "${status}". Valid next steps: ${from.join(", ")}.` };
  }

  if (status === "completed" && task.deliverable_id && task.status !== "completed") {
    // Content task must have approved copy before it is completed.
    const deliverable = await query<{ category_key: string }>(
      `SELECT category_key FROM project_deliverables WHERE id = $1`,
      [task.deliverable_id]
    );
    if (deliverable[0]) {
      const type = await query<{ content_role: string | null }>(
        `SELECT content_role FROM deliverable_types WHERE key = $1`,
        [deliverable[0].category_key]
      );
      if (type[0]?.content_role && !task.content) {
        return { error: "Add the written content for this deliverable before marking it complete." };
      }
    }
  }

  await query(
    `UPDATE tasks SET status = $2, completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE NULL END
     WHERE id = $1`,
    [taskId, status]
  );

  if (task.deliverable_id) {
    await handleDeliverableTaskCompleted(task.project_id, taskId);
  }

  if (status === "submitted" || status === "completed") {
    const clientId = await getProjectClientId(task.project_id);
    if (clientId && task.step_key) {
      await notifyRoles(["PROJECT_MANAGER", "SUPER_ADMIN"], {
        type: "task",
        title: status === "completed" ? "Task completed" : "Task ready for review",
        body: `${session.name} submitted a task for review.`,
        link: taskLink(clientId, task.project_id, task.step_key),
      });
    }
  }

  revalidatePath("/projects");
  return { ok: true };
}

// ---------- Multi-stage review / approval workflow ----------

interface TaskWorkflowRow {
  id: string;
  project_id: string;
  step_key: string | null;
  role_key: string;
  sequence: number;
  deliverable_id: string | null;
  title: string;
  status: string;
  assigned_to: string | null;
  content: string | null;
}

const CAN_REVIEW = ["PROJECT_MANAGER", "SUPER_ADMIN"];

async function getTaskWorkflowRow(taskId: string): Promise<TaskWorkflowRow | null> {
  const rows = await query<TaskWorkflowRow>(
    `SELECT id, project_id, step_key, role_key, sequence, deliverable_id, title, status, assigned_to, content
     FROM tasks WHERE id = $1`,
    [taskId]
  );
  return rows[0] || null;
}

function isVisualTask(t: TaskWorkflowRow) {
  // Visual tasks may be sequence 1 (when no WRITER is allocated) or 2 (after a content task).
  return t.step_key?.includes("_v_") || (t.role_key === "DESIGNER" || t.role_key === "EDITOR" || t.role_key === "VIDEOGRAPHER");
}

/** Assignee starts work: pending -> in_progress */
export async function startTaskAction(taskId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.assigned_to !== session.sub && !CAN_REVIEW.includes(session.role_key)) {
    return { error: "Only the assignee can start this task." };
  }
  if (task.status !== "pending") return { error: "Task has already started." };

  await query(`UPDATE tasks SET status = 'in_progress' WHERE id = $1`, [taskId]);
  revalidatePath("/projects");
  return { ok: true };
}

/**
 * Assignee submits work for review: in_progress -> submitted.
 * Accepts the content text so "Submit for Review" saves + submits in one step �
 * no separate "Save draft" click required.
 */
export async function submitTaskAction(taskId: string, content?: string | null) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.assigned_to !== session.sub && !CAN_REVIEW.includes(session.role_key)) {
    return { error: "Only the assignee can submit this task." };
  }
  if (!["in_progress", "needs_improvement", "client_feedback"].includes(task.status)) {
    return { error: "Task is not in a submittable state." };
  }

  // Producers may submit with content passed through directly.
  if (["WRITER", "DESIGNER", "EDITOR", "VIDEOGRAPHER"].includes(task.role_key)) {
    const text = content != null ? String(content).trim() : task.content?.trim() || "";
    if (!text) {
      return { error: "Add your work (copy, notes or asset links) before submitting." };
    }
    if (text.length > 5000) return { error: "Content is too long (max 5000 characters)." };
    if (content != null && text !== task.content) {
      await query(`UPDATE tasks SET content = $2 WHERE id = $1`, [taskId, text]);
    }
  }

  await query(`UPDATE tasks SET status = 'submitted', reviewed_at = now() WHERE id = $1`, [taskId]);

  const clientId = await getProjectClientId(task.project_id);
  if (clientId && task.step_key) {
    await notifyRoles(CAN_REVIEW, {
      type: "task",
      title: "Task ready for review",
      body: `${session.name} submitted "${task.title}" for review.`,
      link: taskLink(clientId, task.project_id, task.step_key),
    });
  }

  revalidatePath("/projects");
  return { ok: true };
}

/**
 * Reviewer decision on a submitted task.
 * - Content task (WRITER): 'needs_improvement' | 'final' (completes, auto-creates visual)
 * - Visual task (DESIGNER/EDITOR): 'needs_improvement' | 'approve' (hands off to SMM)
 */
export async function reviewTaskAction(taskId: string, decision: "needs_improvement" | "final" | "approve", comment?: string) {
  const session = await getSession();
  if (!session || !CAN_REVIEW.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.status !== "submitted") return { error: "Task is not awaiting review." };
  if (decision === "needs_improvement" && (!comment || comment.trim().length < 5)) {
    return { error: "Please provide specific feedback for the improvement." };
  }

  const commentText = comment?.trim() || null;

  // Pre-fetch clientId for deep-linking notifications.
  const clientId = await getProjectClientId(task.project_id);
  const taskDeepLink = clientId && task.step_key ? taskLink(clientId, task.project_id, task.step_key) : "/projects";

  if (decision === "needs_improvement") {
    await query(
      `UPDATE tasks SET status = 'needs_improvement', review_comment = $2, reviewed_by = $3, reviewed_at = now()
       WHERE id = $1`,
      [taskId, commentText, session.sub]
    );
    if (task.assigned_to) {
      await createNotification({
        userId: task.assigned_to,
        type: "task",
        title: "Task needs improvement",
        body: `"${task.title}" � ${commentText}`,
        link: taskDeepLink,
      });
    }
  } else if (task.role_key === "WRITER" && decision === "final") {
    // Final approval: complete content task and auto-create the visual task.
    await query(
      `UPDATE tasks SET status = 'completed', review_comment = $2, reviewed_by = $3, reviewed_at = now(), completed_at = now()
       WHERE id = $1`,
      [taskId, commentText, session.sub]
    );
    if (task.assigned_to) {
      await createNotification({
        userId: task.assigned_to,
        type: "task",
        title: "Content approved",
        body: `Your copy for "${task.title}" was approved.`,
        link: taskDeepLink,
      });
    }
    await handleDeliverableTaskCompleted(task.project_id, taskId);
  } else if (isVisualTask(task) && decision === "approve") {
    // Internal approval: hand off to SMM for client approval.
    const smmId = await handoffVisualTaskToSmm(task.project_id, taskId);
    await query(
      `UPDATE tasks SET review_comment = $2, reviewed_by = $3 WHERE id = $1`,
      [taskId, commentText, session.sub]
    );
    if (smmId) {
      await createNotification({
        userId: smmId,
        type: "task",
        title: "Design approved � take to client",
        body: `"${task.title}" passed internal review. Get client approval to proceed.`,
        link: taskDeepLink,
      });
    } else {
      await notifyRoles(["SMM"], {
        type: "task",
        title: "Design approved � take to client",
        body: `"${task.title}" passed internal review and needs client approval.`,
        link: taskDeepLink,
      });
    }
  } else {
    return { error: "Invalid review decision for this task." };
  }

  revalidatePath("/projects");
  return { ok: true };
}

/** SMM routes client feedback back to the designer / editor. */
export async function clientFeedbackAction(taskId: string, feedback: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SMM") return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.status !== "client_review") return { error: "Task is not in client review." };
  if (!feedback || feedback.trim().length < 5) {
    return { error: "Please capture the client's feedback notes." };
  }

  const producerId = await routeVisualTaskToProducer(task.project_id, taskId, task.role_key);
  await query(
    `UPDATE tasks SET client_feedback = $2 WHERE id = $1`,
    [taskId, feedback.trim()]
  );

  const who = producerId
    ? (await query<{ full_name: string }>(`SELECT full_name FROM users WHERE id = $1`, [producerId]))[0]?.full_name
    : "the design team";

  const clientId = await getProjectClientId(task.project_id);
  const taskDeepLink = clientId && task.step_key ? taskLink(clientId, task.project_id, task.step_key) : "/projects";

  await notifyRoles(CAN_REVIEW, {
    type: "task",
    title: "Client feedback received",
    body: `Client gave feedback on "${task.title}" � routed back to ${who}.`,
    link: taskDeepLink,
  });

  revalidatePath("/projects");
  return { ok: true };
}

/** SMM marks client-approved: client_review -> uploading (auto-shift once approved). */
export async function approveClientAction(taskId: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SMM") return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.status !== "client_review") return { error: "Task is not in client review." };

  await query(`UPDATE tasks SET status = 'uploading', reviewed_at = now() WHERE id = $1`, [taskId]);

  const clientId = await getProjectClientId(task.project_id);
  const taskDeepLink = clientId && task.step_key ? taskLink(clientId, task.project_id, task.step_key) : "/projects";

  const creatorId = await getProjectCreatorId(task.project_id);
  if (creatorId) {
    await createNotification({
      userId: creatorId,
      type: "task",
      title: "Client approved",
      body: `Client approved "${task.title}".`,
      link: taskDeepLink,
    });
  }
  await notifyRoles(CAN_REVIEW, {
    type: "task",
    title: "Client approved",
    body: `Client approved "${task.title}".`,
    link: taskDeepLink,
  });

  revalidatePath("/projects");
  return { ok: true };
}

/** SMM completes the task with the publishing platforms. */
export async function completeTaskWithPlatformsAction(taskId: string, platforms: string[]) {
  const session = await getSession();
  if (!session || session.role_key !== "SMM") return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.status !== "uploading") return { error: "Mark the task as uploading first." };

  const clean = platforms.filter((p) => p && ["instagram", "facebook", "youtube", "twitter"].includes(p));
  if (clean.length === 0) {
    return { error: "Select at least one publishing platform before marking the task done." };
  }

  await query(
    `UPDATE tasks SET status = 'completed', platforms = $2, completed_at = now() WHERE id = $1`,
    [taskId, clean]
  );
  await handleDeliverableTaskCompleted(task.project_id, taskId);

  const creatorId = await getProjectCreatorId(task.project_id);
  if (creatorId) {
    const clientId = await getProjectClientId(task.project_id);
    const taskDeepLink = clientId && task.step_key ? taskLink(clientId, task.project_id, task.step_key) : "/projects";
    await createNotification({
      userId: creatorId,
      type: "task",
      title: "Deliverable published",
      body: `"${task.title}" was published to ${clean.join(", ")}.`,
      link: taskDeepLink,
    });
  }

  revalidatePath("/projects");
  return { ok: true };
}

export async function setTaskAssigneeAction(taskId: string, assigneeId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }
  await query(`UPDATE tasks SET assigned_to = $2 WHERE id = $1`, [taskId, assigneeId || null]);
  if (assigneeId) {
    await query(
      `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [taskId, assigneeId]
    );

    // Dynamic role labeling: update the task's role to match the assigned person's role.
    const assigneeRole = await query<{ role_key: string }>(
      `SELECT u.role_key FROM users u WHERE u.id = $1`, [assigneeId]
    );
    if (assigneeRole[0]) {
      await query(`UPDATE tasks SET role_key = $2 WHERE id = $1`, [taskId, assigneeRole[0].role_key]);
    }
  }

  if (assigneeId && assigneeId !== session.sub) {
    const taskRow = await query<{ title: string; project_id: string; step_key: string }>(
      `SELECT title, project_id, step_key FROM tasks WHERE id = $1`, [taskId]
    );
    const clientId = taskRow[0] ? await getProjectClientId(taskRow[0].project_id) : null;
    const taskDeepLink = clientId && taskRow[0]?.step_key
      ? taskLink(clientId, taskRow[0].project_id, taskRow[0].step_key)
      : "/projects";
    await createNotification({
      userId: assigneeId,
      type: "task",
      title: "New task assigned to you",
      body: taskRow[0]?.title ?? "A new task was assigned to you.",
      link: taskDeepLink,
    });
  }

  revalidatePath("/projects");
  return { ok: true };
}

/** Removes one specific member from a task without touching other assignees. */
export async function removeTaskAssigneeAction(taskId: string, userId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  try {
    await query(`DELETE FROM task_assignees WHERE task_id = $1 AND user_id = $2`, [taskId, userId]);
  } catch {
    return { error: "Failed to remove team member." };
  }

  const task = await query<{ assigned_to: string | null; title: string }>(
    `SELECT assigned_to, title FROM tasks WHERE id = $1`,
    [taskId]
  );
  if (task[0]?.assigned_to === userId) {
    const next = await query<{ user_id: string }>(
      `SELECT ta.user_id FROM task_assignees ta JOIN users u ON u.id = ta.user_id
       WHERE ta.task_id = $1 ORDER BY u.full_name ASC LIMIT 1`,
      [taskId]
    );
    await query(`UPDATE tasks SET assigned_to = $2 WHERE id = $1`, [taskId, next[0]?.user_id ?? null]);
  }

  // If no assignees remain, reset role_key to avoid stale role labeling.
  const remaining = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM task_assignees WHERE task_id = $1`,
    [taskId]
  );
  if (Number(remaining[0]?.c ?? 0) === 0) {
    await query(`UPDATE tasks SET assigned_to = NULL, role_key = NULL WHERE id = $1`, [taskId]);
  }

  if (userId !== session.sub) {
    const taskRow = await query<{ title: string; project_id: string; step_key: string }>(
      `SELECT title, project_id, step_key FROM tasks WHERE id = $1`, [taskId]
    );
    const clientId = taskRow[0] ? await getProjectClientId(taskRow[0].project_id) : null;
    const taskDeepLink = clientId && taskRow[0]?.step_key
      ? taskLink(clientId, taskRow[0].project_id, taskRow[0].step_key)
      : "/projects";
    await createNotification({
      userId,
      type: "task",
      title: "Removed from a task",
      body: `You were unassigned from "${taskRow[0]?.title ?? "a task"}".`,
      link: taskDeepLink,
    });
  }

  revalidatePath("/projects");
  return { ok: true };
}

export async function assignProjectTeamAction(
  projectId: string,
  allocations: { role_key: string; user_id: string | null; deadline?: string | null }[]
) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const clean = allocations.filter((a) => a.role_key && a.user_id);
  await allocateProjectTeam(projectId, clean);

  const project = await query<{ name: string; client_id: string }>(`SELECT name, client_id FROM projects WHERE id = $1`, [projectId]);
  const projectName = project[0]?.name ?? "Project";
  const projectClientId = project[0]?.client_id;
  for (const a of clean) {
    if (a.user_id && a.user_id !== session.sub) {
      await createNotification({
        userId: a.user_id,
        type: "project",
        title: "You're on a new project team",
        body: `You've been assigned to "${projectName}".`,
        link: projectClientId ? projectLink(projectClientId, projectId) : "/projects",
      });
    }
  }

  revalidatePath("/projects");
  return { ok: true };
}

export async function extendDeadlineAction(projectId: string, deadline: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }
  await query(`UPDATE projects SET deadline = $2 WHERE id = $1`, [projectId, deadline || null]);
  revalidatePath("/projects");
  return { ok: true };
}

export async function deleteProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Not authorized." };
  }
  await query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  revalidatePath("/projects");
  return { ok: true };
}

/** Super Admin only: cleanly removes a client and all their projects/tasks. */
export async function deleteClientAction(clientId: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Only the Super Admin can remove clients." };
  }

  const client = (
    await query<{ name: string }>(`SELECT name FROM clients WHERE id = $1`, [clientId])
  )[0];
  if (!client) return { error: "Client not found." };

  await query(`DELETE FROM clients WHERE id = $1`, [clientId]);

  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/leads");
  return { ok: true, name: client.name };
}

/** Admins/PMs can manually adjust any task deadline (editable timelines). */
export async function updateTaskDueDateAction(taskId: string, date: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }
  await setTaskDeadline(taskId, date);

  const task = (
    await query<{ title: string; assigned_to: string | null; project_id: string; step_key: string }>(
      `SELECT title, assigned_to, project_id, step_key FROM tasks WHERE id = $1`,
      [taskId]
    )
  )[0];
  if (task?.assigned_to && task.assigned_to !== session.sub) {
    const clientId = await getProjectClientId(task.project_id);
    const taskDeepLink = clientId && task.step_key
      ? taskLink(clientId, task.project_id, task.step_key)
      : "/projects";
    await createNotification({
      userId: task.assigned_to,
      type: "task",
      title: "Deadline updated",
      body: `"${task.title}" is now due ${date ? new Date(`${date}T00:00:00`).toLocaleDateString() : "�"} (set by ${session.name}).`,
      link: taskDeepLink,
    });
  }

  revalidatePath("/projects");
  return { ok: true };
}

/**
 * Emergency leave handling. Marks a team member on leave for this project with
 * a reason and day counter; their open task deadlines extend by that many
 * working days (Sundays excluded) and every subsequent task in the pipeline
 * shifts by the same amount.
 */
export async function setMemberLeaveAction(
  projectId: string,
  userId: string,
  days: number,
  reason: string
) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }
  if (!reason || reason.trim().length < 3) {
    return { error: "Please enter the reason for the leave." };
  }

  await extendForLeave(projectId, userId, days, reason.trim());

  const leaveClientId = await getProjectClientId(projectId);

  if (userId !== session.sub) {
    await createNotification({
      userId,
      type: "leave",
      title: "Marked on leave",
      body: `${session.name} marked you on leave for ${days} day${days === 1 ? "" : "s"} � deadlines extended automatically.`,
      link: "/attendance",
    });
  }
  await notifyRoles(["SUPER_ADMIN", "PROJECT_MANAGER"], {
    type: "leave",
    title: "Deadline cascade applied",
    body: `${session.name} extended deadlines in a project (${days}d leave).`,
    link: leaveClientId ? projectLink(leaveClientId, projectId) : "/projects",
  });

  revalidatePath("/projects");
  revalidatePath("/attendance");
  return { ok: true };
}

/**
 * Update task remarks � collaborative field for PM, Super Admin, and Sales.
 */
export async function updateTaskRemarksAction(taskId: string, remarks: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!["SUPER_ADMIN", "PROJECT_MANAGER", "SALES"].includes(session.role_key)) {
    return { error: "Not authorized" };
  }
  await query(`UPDATE tasks SET remarks = $1 WHERE id = $2`, [remarks || null, taskId]);
  revalidatePath("/projects");
  return { ok: true };
}

/**
 * Update a task's role_key dynamically based on the assigned person's role.
 * When a team member is assigned, the sub-task label updates to reflect their role.
 */
export async function updateTaskRoleAction(taskId: string, roleKey: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!["SUPER_ADMIN", "PROJECT_MANAGER"].includes(session.role_key)) {
    return { error: "Not authorized" };
  }
  await query(`UPDATE tasks SET role_key = $1 WHERE id = $2`, [roleKey, taskId]);
  revalidatePath("/projects");
  return { ok: true };
}

/**
 * Extend deadline for a specific person's open tasks in a project.
 * Does not affect other team members.
 */
export async function extendPersonDeadlineAction(
  projectId: string,
  userId: string,
  additionalDays: number
) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!["SUPER_ADMIN", "PROJECT_MANAGER"].includes(session.role_key)) {
    return { error: "Not authorized" };
  }

  const { addWorkingDays } = await import("@/lib/workflow");

  const tasks = await query<{ id: string; due_date: string | null }>(
    `SELECT id, due_date::text FROM tasks WHERE project_id = $1
     AND assigned_to = $2 AND status NOT IN ('completed') AND due_date IS NOT NULL`,
    [projectId, userId]
  );

  if (tasks.length === 0) return { error: "No open tasks found for this person." };

  for (const task of tasks) {
    const newDeadline = addWorkingDays(new Date(task.due_date!), additionalDays);
    await query(`UPDATE tasks SET due_date = $1 WHERE id = $2`, [newDeadline.toISOString().slice(0, 10), task.id]);
  }

  // Also extend assignment deadline
  await query(
    `UPDATE assignments SET allotment_deadline = allotment_deadline + INTERVAL '1 day' * $1
     WHERE project_id = $2 AND user_id = $3 AND allotment_deadline IS NOT NULL`,
    [additionalDays, projectId, userId]
  );

  revalidatePath("/projects");
  return { ok: true };
}
