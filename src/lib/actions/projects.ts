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
import { getClientDetail } from "@/lib/data";
import {
  validateEmail,
  validatePhone,
  validateFullName,
  validateText,
  validateDeliverables,
} from "@/lib/validation";

export async function getClientDetailAction(clientId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" } as const;
  if (!hasPermission(session.permissions, "projects:view")) return { error: "Not authorized" } as const;
  try {
    const data = await getClientDetail(clientId);
    return { ok: true as const, ...data };
  } catch {
    return { error: "Failed to load client detail" } as const;
  }
}

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
  const requestedPm = String(formData.get("assigned_pm_id") || "").trim() || null;

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

  let assignedPmId: string | null = null;
  if (requestedPm) {
    const pm = await query<{ id: string }>(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND r.key = 'PROJECT_MANAGER'`,
      [requestedPm]
    );
    if (!pm[0]) return { error: "Selected Project Manager not found." };
    assignedPmId = requestedPm;
  } else if (session.role_key === "PROJECT_MANAGER") {
    // A PM creating a client keeps it in their own scope.
    assignedPmId = session.sub;
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO clients (name, company, email, phone, created_by, assigned_pm_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [name, company, email, phone, session.sub, assignedPmId]
  );

  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/content");
  revalidatePath("/leads");
  return { ok: true, id: rows[0].id };
}

export async function updateClientAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  const allowedRoles = ["SUPER_ADMIN", "PROJECT_MANAGER", "SALES", "ADMIN", "PM"];
  const isAllowed = allowedRoles.includes((session.role_key || "").toUpperCase()) || hasPermission(session.permissions, PERM_CREATE) || hasPermission(session.permissions, PERM_MANAGE) || (session.permissions || []).includes("admin:*");
  if (!isAllowed) return { error: "Not authorized." };

  const clientId = String(formData.get("client_id") || "").trim();
  if (!clientId) return { error: "Client ID required." };
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;

  const nameErr = validateFullName(name);
  if (nameErr) return { error: nameErr };
  if (email) { const e = validateEmail(email); if (e) return { error: e }; }
  if (phone) { const p = validatePhone(phone); if (p) return { error: p }; }
  if (company) { const c = validateText(company, "Company name", 2, 120); if (c) return { error: c }; }

  // PMs can only edit their assigned clients
  if (session.role_key === "PROJECT_MANAGER") {
    const owned = await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1 AND assigned_pm_id = $2`, [clientId, session.sub]);
    if (!owned[0] && !hasPermission(session.permissions, "admin:*")) return { error: "You can only edit your assigned clients." };
  }

  const client = await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1`, [clientId]);
  if (!client[0]) return { error: "Client not found." };

  await query(`UPDATE clients SET name = $1, company = $2, email = $3, phone = $4 WHERE id = $5`, [name, company, email, phone, clientId]);
  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Super Admin only — assigns/reassigns (or clears) the Project Manager of a client. */
export async function assignClientPmAction(clientId: string, pmId: string | null) {
  const session = await getSession();
  if (!session) return { error: "Not authorized." };
  const perms = session.permissions || [];
  const isSuperAdmin = session.role_key === "SUPER_ADMIN" || perms.includes("admin:*");
  if (!isSuperAdmin) return { error: "Only Super Admins can assign a Project Manager." };

  const client = await query<{ id: string }>(`SELECT id FROM clients WHERE id = $1`, [clientId]);
  if (!client[0]) return { error: "Client not found." };

  let resolvedPmId: string | null = null;
  if (pmId) {
    const pm = await query<{ id: string }>(
      `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND r.key = 'PROJECT_MANAGER'`,
      [pmId]
    );
    if (!pm[0]) return { error: "Selected Project Manager not found." };
    resolvedPmId = pmId;
  }

  await query(`UPDATE clients SET assigned_pm_id = $2 WHERE id = $1`, [clientId, resolvedPmId]);

  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/content");
  revalidatePath("/leads");
  return { ok: true };
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
  let taskTitles: Record<string, string[]> | undefined;
  try {
    const raw = String(formData.get("task_titles_json") || "");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) taskTitles = parsed as Record<string, string[]>;
    }
  } catch {}

  if (!client_id) return { error: "Client is required." };

  const clientRows = await query<{ id: string; assigned_pm_id: string | null }>(
    `SELECT id, assigned_pm_id FROM clients WHERE id = $1`,
    [client_id]
  );
  if (!clientRows[0]) return { error: "Client not found." };
  if (session.role_key === "PROJECT_MANAGER" && clientRows[0].assigned_pm_id !== session.sub) {
    return { error: "You can only create projects under your own assigned clients." };
  }

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

    await generateDeliverableTasks(project[0].id, taskTitles);
    await syncApprovedTaskSequences(project[0].id);
    await computeSequentialDeadlines(project[0].id, { propagateToAll: true });

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

/** Update a project (name / brief / deadline). Manager only. */
export async function updateProjectAction(projectId: string, data: { name?: string; brief?: string | null; deadline?: string | null }) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, PERM_MANAGE)) {
    return { error: "Not authorized." };
  }
  const project = await query<{ id: string; deadline: string | null }>(
    `SELECT id, deadline::text AS deadline FROM projects WHERE id = $1`,
    [projectId]
  );
  if (!project[0]) return { error: "Project not found." };
  const sets: string[] = [];
  const vals: unknown[] = [];
  let deadlineChanged = false;
  if (data.name !== undefined) {
    const clean = String(data.name).trim().replace(/\n+/g, " ").slice(0, 120);
    if (!clean || clean.length < 3) return { error: "Project name too short." };
    sets.push(`name = $${vals.length + 1}`);
    vals.push(clean);
  }
  if (data.brief !== undefined) {
    const clean = data.brief != null ? String(data.brief).trim().slice(0, 2000) : null;
    sets.push(`brief = $${vals.length + 1}`);
    vals.push(clean);
  }
  if (data.deadline !== undefined) {
    const v = data.deadline ? String(data.deadline).trim() : null;
    const clean = v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    sets.push(`deadline = $${vals.length + 1}`);
    vals.push(clean);
    deadlineChanged = clean !== project[0].deadline;
  }
  if (sets.length === 0) return { error: "Nothing to update." };
  vals.push(projectId);
  await query(`UPDATE projects SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
  // When the project deadline changes, push the new date onto every open sub-task.
  if (deadlineChanged) {
    await computeSequentialDeadlines(projectId, { propagateToAll: true });
  }
  revalidatePath("/projects");
  revalidatePath("/clients");
  return { ok: true };
}

/** Delete a project and its tasks. Manager with delete permission only. */
export async function deleteProjectAction(projectId: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, PERM_DELETE)) {
    return { error: "Only Super Admin can delete projects." };
  }
  const project = await query<{ name: string }>(`SELECT name FROM projects WHERE id = $1`, [projectId]);
  if (!project[0]) return { error: "Project not found." };
  await query(`DELETE FROM projects WHERE id = $1`, [projectId]);
  revalidatePath("/projects");
  revalidatePath("/clients");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function getProjectEditDataAction(projectId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" } as const;
  if (!hasPermission(session.permissions, PERM_MANAGE)) return { error: "Not authorized." } as const;
  const project = await query<{ id: string; name: string; brief: string | null; deadline: string | null }>(
    `SELECT id, name, brief, deadline::text AS deadline FROM projects WHERE id = $1`,
    [projectId]
  );
  if (!project[0]) return { error: "Project not found." } as const;
  const deliverables = await query<{ category_key: string; category_label: string; quantity: number; is_custom: boolean; custom_label: string | null }>(
    `SELECT category_key, category_label, quantity, is_custom, custom_label FROM project_deliverables WHERE project_id = $1`,
    [projectId]
  );
  return { ok: true as const, project: project[0], deliverables };
}

export async function addTasksToProjectAction(projectId: string, deliverablesJson: string, taskTitlesJson?: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, PERM_MANAGE)) return { error: "Not authorized." } as const;
  const project = await query<{ id: string; client_id: string }>(`SELECT id, client_id FROM projects WHERE id = $1`, [projectId]);
  if (!project[0]) return { error: "Project not found." } as const;
  const deliverables = parseDeliverables(deliverablesJson);
  if (deliverables.length === 0 || deliverables.every((d) => d.quantity <= 0)) return { error: "Add at least one deliverable." } as const;
  const errs = validateDeliverables(deliverables);
  if (errs.length) return { error: errs[0].message } as const;
  let taskTitles: Record<string, string[]> | undefined;
  try {
    if (taskTitlesJson) {
      const parsed = JSON.parse(taskTitlesJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) taskTitles = parsed as Record<string, string[]>;
    }
  } catch {}
  // Fetch existing to handle updates (e.g., 3 -> 4) vs inserts, and clean up decreased quantities
  const existing = await query<{ id: string; category_key: string; quantity: number; is_custom: boolean }>(
    `SELECT id, category_key, quantity, is_custom FROM project_deliverables WHERE project_id = $1`,
    [projectId]
  );
  const existingMap = new Map(existing.map((e) => [e.is_custom ? `custom:${e.category_key}:${e.id}` : e.category_key, e]));
  // For standard types, use category_key as map key; for custom, use label
  const newMap = new Map<string, (typeof deliverables)[number]>();
  for (const d of deliverables.filter((x) => x.quantity > 0)) {
    const key = d.isCustom && d.customLabel ? `custom:${d.customLabel}` : d.key;
    newMap.set(key, d);
  }
  // Update or insert
  for (const [key, d] of newMap) {
    const isCustomKey = key.startsWith("custom:");
    const lookupKey = d.isCustom ? key : d.key;
    // Find existing by category_key for standard, or by custom label for custom
    let ex: typeof existing[number] | undefined;
    if (d.isCustom && d.customLabel) {
      ex = existing.find((e) => e.is_custom && e.category_key === d.key);
      // For custom, also check label match via category_label? Simplify: find any custom with same label
      if (!ex) {
        const rows = await query<{ id: string; category_key: string; quantity: number }>(
          `SELECT id, category_key, quantity FROM project_deliverables WHERE project_id = $1 AND is_custom = true AND custom_label = $2 LIMIT 1`,
          [projectId, d.customLabel]
        );
        ex = rows[0] as any;
      }
    } else {
      ex = existing.find((e) => e.category_key === d.key && !e.is_custom);
    }
    const label = d.isCustom && d.customLabel ? d.customLabel : d.label;
    if (ex) {
      if (ex.quantity !== d.quantity) {
        await query(`UPDATE project_deliverables SET quantity = $1, category_label = $2, is_custom = $3, custom_label = $4 WHERE id = $5`, [d.quantity, label, d.isCustom, d.customLabel || null, ex.id]);
        if (d.quantity < ex.quantity) {
          // Delete excess tasks beyond new quantity (e.g., 3->2, delete _d_03)
          for (let i = d.quantity + 1; i <= ex.quantity; i++) {
            const pad2 = String(i).padStart(2, "0");
            await query(`DELETE FROM tasks WHERE project_id = $1 AND step_key IN ($2, $3)`, [projectId, `${d.key}_d_${i}`, `${d.key}_d_${pad2}`]);
            // Also handle custom
            if (d.isCustom) {
              await query(`DELETE FROM tasks WHERE deliverable_id = $1 AND step_key LIKE $2`, [ex.id, `%_d_${i}`]);
            }
          }
        }
      }
    } else {
      await query(
        `INSERT INTO project_deliverables (project_id, category_key, category_label, quantity, is_custom, custom_label)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, d.key, label, d.quantity, d.isCustom, d.customLabel || null]
      );
    }
  }
  await generateDeliverableTasks(projectId, taskTitles);
  await syncApprovedTaskSequences(projectId);
  await computeSequentialDeadlines(projectId);
  revalidatePath("/projects");
  revalidatePath("/clients");
  return { ok: true as const };
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
