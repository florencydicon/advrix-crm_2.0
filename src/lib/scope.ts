import type { SessionPayload } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export type DataScope =
  | { kind: "global" }
  | { kind: "pm"; userId: string }
  | { kind: "self"; userId: string };

/**
 * Resolves the data isolation scope for the current user.
 *
 *  - PROJECT_MANAGER -> only data belonging to their assigned clients
 *    (`clients.assigned_pm_id = <user>`). Never global, even though PMs also
 *    hold `projects:view` + `projects:manage`.
 *  - `admin:*` (Super Admin) or both `projects:view` + `projects:manage`
 *    without a PM role -> global.
 *  - Everyone else (producers/editorial staff) -> only rows they personally
 *    own / are assigned to.
 */
export function resolveDataScope(session: SessionPayload | null | undefined): DataScope {
  if (!session) return { kind: "global" };
  const perms = session.permissions || [];
  if (session.role_key === "PROJECT_MANAGER") return { kind: "pm", userId: session.sub };
  if (perms.includes("admin:*")) return { kind: "global" };
  if (hasPermission(perms, "projects:view") && hasPermission(perms, "projects:manage")) {
    return { kind: "global" };
  }
  return { kind: "self", userId: session.sub };
}

/**
 * Appends a `clients <alias>.assigned_pm_id = $N` condition to a query built
 * via `params`. Returns an empty string for any scope other than PM. The user
 * id placeholder is pushed at the end of `params`, so it is always the next
 * available `$N` and existing placeholders are never renumbered.
 */
export function pmClientWhere(alias: string, params: unknown[], scope: DataScope): string {
  if (scope.kind !== "pm") return "";
  params.push(scope.userId);
  return `${alias}.assigned_pm_id = $${params.length}`;
}

/**
 * True once the user is confirmed as a Project Manager (used to validate the
 * `assigned_pm_id` accepted by client mutations).
 */
export function isPmRoleKey(roleKey: string | null | undefined): boolean {
  return roleKey === "PROJECT_MANAGER";
}