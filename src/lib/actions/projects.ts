"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import {
  generateDeliverableTasks,
  computeSequentialDeadlines,
  extendForLeave,
  syncApprovedTaskSequences,
} from "@/lib/workflow";
import { createNotification, notifyRoles } from "@/lib/notifications";
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

function projectLink(_clientId: string, _projectId: string) {
  return `/projects`;
}

interface DeliverableInput {
  key: string;
  label: string;
  quantity: number;
  isCustom: boolean;
  customLabel?: string | null;
}
/* Permission keys (evaluated via hasPermission — `admin:*` always passes). */
const PERM_CREATE = "projects:create";
const PERM_MANAGE = "projects:manage";
const PERM_DELETE = "projects:delete";

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
  if (!session || !hasPermission(session.permissions, PERM_CREATE)) {
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
  if (!session || !hasPermission(session.permissions, PERM_CREATE)) {
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
      .map((d) => `${d.quantity} × ${d.isCustom && d.customLabel ? d.customLabel : d.label}`)
      .join(", ") || null;

  try {
    const project = await query<{ id: string }>(
      `INSERT INTO projects (client_id, name, status, brief, deliverables, deadline, created_by,
        approved_by, approved_at)
       VALUES ($1, $2, 'in_progress', $3, $4, $5, $6, $7, now()) RETURNING id`,
      [client_id, name, brief, deliverableSummary, deadline, session.sub, session.sub]
    );

    for (const d of deliverables.filter((x) => x.quantity > 0)) {
      await query(
        `INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [project[0].id, d.key, d.isCustom && d.customLabel ? d.customLabel : d.label, d.quantity, d.isCustom, d.customLabel]
      );
    }

    await generateDeliverableTasks(project[0].id);
    await syncApprovedTaskSequences(project[0].id);
    await computeSequentialDeadlines(project[0].id);

    revalidatePath("/projects");
    revalidatePath("/clients");
    await notifyRoles(["PROJECT_MANAGER", "SUPER_ADMIN"], {
      type: "project",
      title: "New project in production",
      body: `${name} added by ${session.name} — tasks are ready in the pipeline.`,
      link: projectLink(client_id, project[0].id),
    });
    return { ok: true, id: project[0].id };
  } catch (err) {
    console.error("createProjectAction failed:", err);
    return { error: "Failed to create project. Please try again." };
  }
}

/** Super Admin only: cleanly removes a client and all their projects/tasks. */
export async function deleteClientAction(clientId: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, PERM_DELETE)) {
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
  if (!session || !hasPermission(session.permissions, PERM_MANAGE)) {
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
      body: `${session.name} marked you on leave for ${days} day${days === 1 ? "" : "s"} — deadlines extended automatically.`,
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
