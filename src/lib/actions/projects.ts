"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { runWorkflow, generateDeliverableTasks, handleDeliverableTaskCompleted, allocateProjectTeam } from "@/lib/workflow";
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
  return { ok: true, id: project[0].id };
}

export async function approveProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  const project = await query<{ id: string }>(
    `SELECT id FROM projects WHERE id = $1 AND status = 'pending_approval'`,
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

  revalidatePath("/projects");
  revalidatePath("/app");
  return { ok: true };
}

export async function rejectProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  await query(`UPDATE projects SET status = 'rejected' WHERE id = $1`, [projectId]);
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateTaskContentAction(taskId: string, content: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const text = String(content || "").trim();
  if (text.length < 20) return { error: "Content must be at least 20 characters." };
  if (text.length > 5000) return { error: "Content is too long (max 5000 characters)." };
  const placeholderErr = validateText(text, "Content", 20, 5000);
  if (placeholderErr) return { error: placeholderErr };

  const task = await query<{ assigned_to: string | null }>(
    `SELECT assigned_to FROM tasks WHERE id = $1`,
    [taskId]
  );
  if (!task[0]) return { error: "Task not found." };
  if (task[0].assigned_to !== session.sub && !CAN_MANAGE.includes(session.role_key)) {
    return { error: "Not authorized." };
  }

  await query(`UPDATE tasks SET content = $2 WHERE id = $1`, [taskId, text]);
  revalidatePath("/app");
  revalidatePath("/projects");
  return { ok: true };
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };

  const allowed = ["pending", "in_progress", "review", "completed"];
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
