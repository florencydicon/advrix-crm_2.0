"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  runWorkflow,
  generateDeliverableTasks,
  handleDeliverableTaskCompleted,
  allocateProjectTeam,
  handoffVisualTaskToSmm,
  routeVisualTaskToProducer,
} from "@/lib/workflow";
import { createNotification, getProjectCreatorId, notifyRoles } from "@/lib/notifications";
import {
  validateEmail,
  validatePhone,
  validateFullName,
  validateText,
  validateBrief,
  validateDeliverables,
} from "@/lib/validation";

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
  if (brief) {
    const briefErr = validateBrief(brief);
    if (briefErr) return { error: briefErr };
  } else {
    return { error: "Project brief is required." };
  }

  const delivErrors = validateDeliverables(deliverables);
  if (delivErrors.length > 0) return { error: delivErrors[0].message };

  const deliverableSummary =
    deliverables
      .filter((d) => d.quantity > 0)
      .map((d) => `${d.quantity} × ${d.isCustom && d.customLabel ? d.customLabel : d.label}`)
      .join(", ") || null;

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
    link: "/projects",
  });
  return { ok: true, id: project[0].id };
}

export async function approveProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const project = await query<{ id: string; name: string }>(
    `SELECT id, name FROM projects WHERE id = $1 AND status = 'pending_approval'`,
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
  await runWorkflow(projectId);

  const creatorId = await getProjectCreatorId(projectId);
  if (creatorId) {
    await createNotification({
      userId: creatorId,
      type: "project",
      title: "Project approved",
      body: `"${project[0].name}" was approved and is now in production.`,
      link: "/projects",
    });
  }

  revalidatePath("/projects");
  revalidatePath("/app");
  return { ok: true };
}

export async function rejectProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const project = await query<{ id: string; name: string; created_by: string | null }>(
    `SELECT id, name, created_by FROM projects WHERE id = $1`,
    [projectId]
  );
  await query(`UPDATE projects SET status = 'rejected' WHERE id = $1`, [projectId]);

  if (project[0]?.created_by) {
    await createNotification({
      userId: project[0].created_by,
      type: "project",
      title: "Project rejected",
      body: `"${project[0]?.name ?? "Project"}" was rejected. Contact your manager for details.`,
      link: "/projects",
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

  const isWriter = task[0].role_key === "WRITER";
  const minLen = isWriter ? 20 : 5;
  const text = String(content || "").trim();
  if (text.length < minLen) return { error: `Content must be at least ${minLen} characters.` };
  if (text.length > 5000) return { error: "Content is too long (max 5000 characters)." };
  const placeholderErr = validateText(text, "Content", minLen, 5000);
  if (placeholderErr) return { error: placeholderErr };

  await query(`UPDATE tasks SET content = $2 WHERE id = $1`, [taskId, text]);
  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const allowed = ["pending", "in_progress", "submitted", "needs_improvement", "client_review", "client_feedback", "client_approved", "uploading", "completed"];
  if (!allowed.includes(status)) return { error: "Invalid status." };

  const taskRows = await query<{ project_id: string; deliverable_id: string | null; content: string | null; status: string }>(
    `SELECT project_id, deliverable_id, content, status FROM tasks WHERE id = $1`,
    [taskId]
  );
  const task = taskRows[0];
  if (!task) return { error: "Task not found." };

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
  } else {
    await runWorkflow(task.project_id);
  }

  if (status === "submitted" || status === "completed") {
    await notifyRoles(["PROJECT_MANAGER", "SUPER_ADMIN"], {
      type: "task",
      title: status === "completed" ? "Task completed" : "Task ready for review",
      body: `${session.name} submitted a task for review.`,
      link: "/projects",
    });
  }

  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

// ---------- Multi-stage review / approval workflow ----------

interface TaskWorkflowRow {
  id: string;
  project_id: string;
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
    `SELECT id, project_id, role_key, sequence, deliverable_id, title, status, assigned_to, content
     FROM tasks WHERE id = $1`,
    [taskId]
  );
  return rows[0] || null;
}

function isVisualTask(t: TaskWorkflowRow) {
  return t.sequence === 2 && (t.role_key === "DESIGNER" || t.role_key === "EDITOR");
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
  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

/** Assignee submits work for review: in_progress -> submitted */
export async function submitTaskAction(taskId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.assigned_to !== session.sub && !CAN_REVIEW.includes(session.role_key)) {
    return { error: "Only the assignee can submit this task." };
  }
  if (!["in_progress", "needs_improvement", "client_feedback"].includes(task.status)) {
    return { error: "Task is not in an editable state." };
  }

  // Producers must have entered their work before submitting.
  if (["WRITER", "DESIGNER", "EDITOR"].includes(task.role_key)) {
    const minLen = task.role_key === "WRITER" ? 20 : 5;
    const hasContent = await query<{ has: string }>(
      `SELECT (content IS NOT NULL AND length(trim(content)) >= $2)::text AS has FROM tasks WHERE id = $1`,
      [taskId, minLen]
    );
    if (hasContent[0]?.has !== "true") {
      return {
        error:
          task.role_key === "WRITER"
            ? "Enter the written copy (at least 20 characters) before submitting for review."
            : "Add the asset link / work notes (at least 5 characters) before submitting for review.",
      };
    }
  }

  await query(`UPDATE tasks SET status = 'submitted', reviewed_at = now() WHERE id = $1`, [taskId]);

  await notifyRoles(CAN_REVIEW, {
    type: "task",
    title: "Task ready for review",
    body: `${session.name} submitted "${task.title}" for review.`,
    link: "/projects",
  });

  revalidatePath("/app");
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
        body: `"${task.title}" — ${commentText}`,
        link: "/projects",
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
        link: "/projects",
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
        title: "Design approved — take to client",
        body: `"${task.title}" passed internal review. Get client approval to proceed.`,
        link: "/projects",
      });
    } else {
      await notifyRoles(["SMM"], {
        type: "task",
        title: "Design approved — take to client",
        body: `"${task.title}" passed internal review and needs client approval.`,
        link: "/projects",
      });
    }
  } else {
    return { error: "Invalid review decision for this task." };
  }

  revalidatePath("/app");
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
  await notifyRoles(CAN_REVIEW, {
    type: "task",
    title: "Client feedback received",
    body: `Client gave feedback on "${task.title}" — routed back to ${who}.`,
    link: "/projects",
  });

  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

/** SMM marks client-approved: client_review -> client_approved */
export async function approveClientAction(taskId: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SMM") return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.status !== "client_review") return { error: "Task is not in client review." };

  await query(`UPDATE tasks SET status = 'client_approved', reviewed_at = now() WHERE id = $1`, [taskId]);

  const creatorId = await getProjectCreatorId(task.project_id);
  if (creatorId) {
    await createNotification({
      userId: creatorId,
      type: "task",
      title: "Client approved",
      body: `Client approved "${task.title}".`,
      link: "/projects",
    });
  }
  await notifyRoles(CAN_REVIEW, {
    type: "task",
    title: "Client approved",
    body: `Client approved "${task.title}".`,
    link: "/projects",
  });

  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

/** SMM starts uploading: client_approved -> uploading */
export async function startUploadTaskAction(taskId: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SMM") return { error: "Not authorized." };

  const task = await getTaskWorkflowRow(taskId);
  if (!task) return { error: "Task not found." };
  if (task.status !== "client_approved") return { error: "Client approval is required first." };

  await query(`UPDATE tasks SET status = 'uploading' WHERE id = $1`, [taskId]);
  revalidatePath("/app");
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
    await createNotification({
      userId: creatorId,
      type: "task",
      title: "Deliverable published",
      body: `"${task.title}" was published to ${clean.join(", ")}.`,
      link: "/projects",
    });
  }

  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

export async function setTaskAssigneeAction(taskId: string, assigneeId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }
  await query(`UPDATE tasks SET assigned_to = $2 WHERE id = $1`, [taskId, assigneeId || null]);

  if (assigneeId && assigneeId !== session.sub) {
    const task = await query<{ title: string }>(`SELECT title FROM tasks WHERE id = $1`, [taskId]);
    await createNotification({
      userId: assigneeId,
      type: "task",
      title: "New task assigned to you",
      body: task[0]?.title ?? "A new task was assigned to you.",
      link: "/projects",
    });
  }

  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

export async function assignProjectTeamAction(
  projectId: string,
  allocations: { role_key: string; user_id: string | null }[]
) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const clean = allocations.filter((a) => a.role_key && a.user_id);
  await allocateProjectTeam(projectId, clean);

  const project = await query<{ name: string }>(`SELECT name FROM projects WHERE id = $1`, [projectId]);
  const projectName = project[0]?.name ?? "Project";
  for (const a of clean) {
    if (a.user_id && a.user_id !== session.sub) {
      await createNotification({
        userId: a.user_id,
        type: "project",
        title: "You're on a new project team",
        body: `You've been assigned to "${projectName}".`,
        link: "/projects",
      });
    }
  }

  revalidatePath("/projects");
  revalidatePath("/app");
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
