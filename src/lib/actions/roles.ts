"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export interface RoleWithPerms {
  key: string;
  label: string;
  dashboard: string;
  permissions: string[];
  builtin: boolean;
  user_count: number;
}

const BUILTIN_ROLES = ["SUPER_ADMIN", "PROJECT_MANAGER", "SALES", "WRITER", "DESIGNER", "EDITOR", "SMM", "VIDEOGRAPHER"];
const VALID_DASHBOARDS = ["admin", "pm", "sales", "staff"];

async function requireRolesManager() {
  const session = await getSession();
  if (!session) return { error: "Not signed in." } as const;
  if (!hasPermission(session.permissions, "roles:manage")) {
    return { error: "Only the Super Admin can manage roles & permissions." } as const;
  }
  return { session } as const;
}

export async function getRolesWithPermissions(): Promise<RoleWithPerms[]> {
  const rows = await query<{
    key: string;
    label: string;
    dashboard: string;
    permissions: string[] | null;
    user_count: string;
  }>(
    `SELECT r.key, r.label, r.dashboard, r.permissions,
            (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id)::text AS user_count
     FROM roles r ORDER BY r.label`
  );
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    dashboard: r.dashboard,
    permissions: r.permissions || [],
    builtin: BUILTIN_ROLES.includes(r.key),
    user_count: Number(r.user_count || 0),
  }));
}

export async function createRoleAction(input: {
  key: string;
  label: string;
  dashboard: string;
  permissions: string[];
}) {
  const auth = await requireRolesManager();
  if ("error" in auth) return { error: auth.error };

  const key = input.key?.trim().toUpperCase();
  const label = input.label?.trim();
  if (!key || !/^[A-Z0-9_]{2,30}$/.test(key)) {
    return { error: "Role key must be 2-30 uppercase letters, numbers or underscores (e.g. ACCOUNTANT)." };
  }
  if (!label) return { error: "Display label is required." };
  if (!VALID_DASHBOARDS.includes(input.dashboard)) return { error: "Invalid dashboard type." };

  const existing = await query<{ id: string }>(`SELECT id FROM roles WHERE key = $1`, [key]);
  if (existing[0]) return { error: `Role "${key}" already exists.` };

  await query(
    `INSERT INTO roles (key, label, dashboard, permissions) VALUES ($1, $2, $3, $4)`,
    [key, label, input.dashboard, input.permissions || []]
  );
  await logActivity({
    action: "role_created",
    entityType: "role",
    entityId: key,
    metadata: { label, dashboard: input.dashboard, permissions: input.permissions || [] },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateRoleAction(
  key: string,
  input: { label: string; dashboard: string; permissions: string[] }
) {
  const auth = await requireRolesManager();
  if ("error" in auth) return { error: auth.error };
  if (key === "SUPER_ADMIN") {
    return { error: "The Super Admin role and its permissions cannot be edited." };
  }

  const label = input.label?.trim();
  if (!label) return { error: "Display label is required." };
  if (!VALID_DASHBOARDS.includes(input.dashboard)) return { error: "Invalid dashboard type." };
  const perms = [...new Set(input.permissions || [])];

  await query(`UPDATE roles SET label = $2, dashboard = $3, permissions = $4 WHERE key = $1`, [
    key,
    label,
    input.dashboard,
    perms,
  ]);
  await logActivity({
    action: "role_updated",
    entityType: "role",
    entityId: key,
    metadata: { label, dashboard: input.dashboard, permissions: perms },
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteRoleAction(key: string) {
  const auth = await requireRolesManager();
  if ("error" in auth) return { error: auth.error };
  if (BUILTIN_ROLES.includes(key)) return { error: "Built-in roles cannot be deleted." };

  const used = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM users WHERE role_id = (SELECT id FROM roles WHERE key = $1)`, [key]);
  if (Number(used[0]?.c || 0) > 0) {
    return { error: "Role is assigned to users. Reassign them first." };
  }

  try {
    await query(`DELETE FROM roles WHERE key = $1`, [key]);
  } catch {
    return { error: "Role is referenced by existing data and cannot be deleted." };
  }
  await logActivity({ action: "role_deleted", entityType: "role", entityId: key, metadata: {} });

  revalidatePath("/settings");
  return { ok: true };
}

/** Set a per-user override (NULL = inherit from role). */
export async function updateUserPermissionsAction(userId: string, permissions: string[] | null) {
  const auth = await requireRolesManager();
  if ("error" in auth) return { error: auth.error };
  if (userId === auth.session.sub) return { error: "You cannot change your own permissions." };

  if (permissions === null || permissions.length === 0) {
    await query(`UPDATE users SET permissions = NULL WHERE id = $1`, [userId]);
  } else {
    await query(`UPDATE users SET permissions = $2 WHERE id = $1`, [userId, [...new Set(permissions)]]);
  }
  await logActivity({
    action: "user_permissions_updated",
    entityType: "user",
    entityId: userId,
    metadata: { permissions: permissions === null ? null : [...new Set(permissions)] },
  });

  revalidatePath("/settings");
  revalidatePath("/team");
  return { ok: true };
}

/** Designation / department shown beside the member's role. */
export async function updateUserDesignationAction(userId: string, designation: string) {
  const auth = await requireRolesManager();
  if ("error" in auth) return { error: auth.error };

  const cleaned = designation?.trim() || null;
  await query(`UPDATE users SET designation = $2 WHERE id = $1`, [userId, cleaned]);
  await logActivity({
    action: "user_designation_updated",
    entityType: "user",
    entityId: userId,
    metadata: { designation: cleaned },
  });

  revalidatePath("/settings");
  revalidatePath("/team");
  return { ok: true };
}