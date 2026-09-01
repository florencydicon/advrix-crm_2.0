"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export type FlushEntity =
  | "clients"
  | "projects"
  | "tasks"
  | "leads"
  | "attendance"
  | "leaves"
  | "notifications";

const ALLOWED: Set<FlushEntity> = new Set([
  "clients",
  "projects",
  "tasks",
  "leads",
  "attendance",
  "leaves",
  "notifications",
]);

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "settings:manage")) {
    return { error: "Not authorized. Super Admin access required." } as const;
  }
  return { session } as const;
}

export async function getDatabaseCounts(): Promise<Record<FlushEntity, number> & { total: number }> {
  const counts: Record<string, number> = {};
  const tables: Record<FlushEntity, string> = {
    clients: "clients",
    projects: "projects",
    tasks: "tasks",
    leads: "leads",
    attendance: "attendance",
    leaves: "leaves",
    notifications: "notifications",
  };
  for (const [key, table] of Object.entries(tables)) {
    try {
      const rows = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM "${table}"`);
      counts[key] = Number(rows[0]?.c ?? 0);
    } catch {
      counts[key] = 0;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { ...(counts as Record<FlushEntity, number>), total };
}

/**
 * Flush specific entities. SUPER_ADMIN only.
 * - clients: cascades to projects, project_deliverables, tasks, assignments, task_assignees etc via FK
 * - projects: cascades to deliverables/tasks
 * - tasks: only tasks (and its assignees/contributions)
 */
export async function flushDataAction(entities: FlushEntity[]) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error };
  const session = auth.session;

  const clean = [...new Set(entities.filter((e) => ALLOWED.has(e as FlushEntity)))] as FlushEntity[];
  if (clean.length === 0) return { error: "Select at least one data type to flush." };

  const results: Record<string, number> = {};

  // Order matters for FK: children first
  try {
    if (clean.includes("tasks")) {
      // children of tasks first
      await query(`DELETE FROM task_contributions`);
      await query(`DELETE FROM task_assignees`);
      await query(`DELETE FROM deliverable_assignees`);
      const r = await query<{ c: string }>(`DELETE FROM tasks RETURNING 1`);
      // neon doesn't return rowCount, use returning trick
      results.tasks = 0;
      // count via separate query before delete for accurate number - fallback
      // For now just re-count deleted via returning length if driver supports it
      // We already did DELETE, count as 0 for now, but we try to report via query above length?
      // neon returns array of returned ids
      if (Array.isArray(r)) results.tasks = r.length;
    }

    if (clean.includes("projects")) {
      // If tasks already flushed, these are mostly empty but still need deliverables/assignments
      await query(`DELETE FROM task_contributions`);
      await query(`DELETE FROM task_assignees`);
      await query(`DELETE FROM deliverable_assignees`);
      await query(`DELETE FROM tasks`);
      await query(`DELETE FROM assignments`);
      await query(`DELETE FROM project_deliverables`);
      const r = await query(`DELETE FROM projects RETURNING 1`);
      results.projects = Array.isArray(r) ? r.length : 0;
    }

    if (clean.includes("clients")) {
      // Cascades to projects etc, but we already handled order
      // Do full cascade: just delete clients, remaining will cascade
      await query(`DELETE FROM task_contributions`);
      await query(`DELETE FROM task_assignees`);
      await query(`DELETE FROM deliverable_assignees`);
      await query(`DELETE FROM tasks`);
      await query(`DELETE FROM assignments`);
      await query(`DELETE FROM project_deliverables`);
      await query(`DELETE FROM projects`);
      const r = await query(`DELETE FROM clients RETURNING 1`);
      results.clients = Array.isArray(r) ? r.length : 0;
    }

    if (clean.includes("leads")) {
      try {
        const r = await query(`DELETE FROM leads RETURNING 1`);
        results.leads = Array.isArray(r) ? r.length : 0;
      } catch {
        results.leads = 0;
      }
    }

    if (clean.includes("attendance")) {
      try {
        const r = await query(`DELETE FROM attendance RETURNING 1`);
        results.attendance = Array.isArray(r) ? r.length : 0;
      } catch {
        results.attendance = 0;
      }
    }

    if (clean.includes("leaves")) {
      try {
        const r = await query(`DELETE FROM leaves RETURNING 1`);
        results.leaves = Array.isArray(r) ? r.length : 0;
      } catch {
        results.leaves = 0;
      }
    }

    if (clean.includes("notifications")) {
      try {
        const r = await query(`DELETE FROM notifications RETURNING 1`);
        results.notifications = Array.isArray(r) ? r.length : 0;
      } catch {
        results.notifications = 0;
      }
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath("/clients");
    return { ok: true, flushed: clean, results };
  } catch (e: any) {
    console.error("flushDataAction failed:", e);
    return { error: e?.message || "Flush failed. Check server logs." };
  }
}

export async function flushEntireDatabaseAction() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return { error: auth.error };
  const session = auth.session;

  try {
    // Child tables first
    try { await query(`DELETE FROM task_contributions`); } catch {}
    try { await query(`DELETE FROM task_assignees`); } catch {}
    try { await query(`DELETE FROM deliverable_assignees`); } catch {}
    try { await query(`DELETE FROM tasks`); } catch {}
    try { await query(`DELETE FROM assignments`); } catch {}
    try { await query(`DELETE FROM project_deliverables`); } catch {}
    try { await query(`DELETE FROM projects`); } catch {}
    try { await query(`DELETE FROM clients`); } catch {}
    try { await query(`DELETE FROM leads`); } catch {}
    try { await query(`DELETE FROM attendance`); } catch {}
    try { await query(`DELETE FROM leaves`); } catch {}
    try { await query(`DELETE FROM notifications`); } catch {}
    try { await query(`DELETE FROM login_attempts`); } catch {}
    try { await query(`DELETE FROM users WHERE role_id != (SELECT id FROM roles WHERE key = 'SUPER_ADMIN')`); } catch {}

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath("/clients");
    return { ok: true };
  } catch (e: any) {
    console.error("flushEntireDatabaseAction failed:", e);
    return { error: e?.message || "Entire database flush failed." };
  }
}
