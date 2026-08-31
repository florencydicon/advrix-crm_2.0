/**
 * Central permission catalog + evaluation helpers.
 *
 * SUPER_ADMIN carries the wildcard `admin:*` which satisfies every check,
 * preserving the "single Super Admin authority" invariant while letting the
 * Super Admin grant granular permissions to custom roles and individual users.
 */

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  // Projects
  { key: "projects:view", label: "View project pipeline", group: "Projects" },
  { key: "projects:create", label: "Create projects & clients", group: "Projects" },
  { key: "projects:manage", label: "Approve / reject & edit projects", group: "Projects" },
  { key: "projects:delete", label: "Delete projects & clients", group: "Projects" },
  { key: "projects:assign", label: "Allot / change project team", group: "Projects" },
  // Tasks
  { key: "tasks:execute", label: "Work on assigned tasks", group: "Tasks" },
  { key: "tasks:review", label: "Review & approve briefs / work", group: "Tasks" },
  { key: "tasks:manage", label: "Manage sequences, deadlines & remarks", group: "Tasks" },
  // Attendance & Leaves
  { key: "attendance:view", label: "View attendance & reports", group: "Attendance & Leaves" },
  { key: "leaves:approve", label: "Approve / reject leave", group: "Attendance & Leaves" },
  // Sales
  { key: "leads:view", label: "View leads", group: "Sales" },
  { key: "leads:manage", label: "Manage leads & pipeline", group: "Sales" },
  // Admin
  { key: "users:manage", label: "Create / edit users", group: "Admin" },
  { key: "roles:manage", label: "Manage roles & permissions", group: "Admin" },
  { key: "settings:manage", label: "Access settings & flush data", group: "Admin" },
  { key: "reports:view", label: "View analytics & reports", group: "Admin" },
  // Communication
  { key: "chat:use", label: "Use internal chat", group: "Communication" },
  { key: "notes:manage", label: "Create & edit notes", group: "Communication" },
  { key: "todos:manage", label: "Manage global to-do list", group: "Communication" },
];

export const PERMISSION_GROUPS = [...new Set(PERMISSION_CATALOG.map((p) => p.group))];

export const PERMISSION_GROUP_KEYS = PERMISSION_GROUPS.map((g) => ({
  group: g,
  items: PERMISSION_CATALOG.filter((p) => p.group === g),
}));

/** Default permission bundles for every built-in role. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ["admin:*"],
  PROJECT_MANAGER: [
    "projects:view",
    "projects:create",
    "projects:manage",
    "projects:delete",
    "projects:assign",
    "tasks:execute",
    "tasks:review",
    "tasks:manage",
    "attendance:view",
    "leads:view",
    "leads:manage",
    "reports:view",
    "chat:use",
    "notes:manage",
    "todos:manage",
  ],
  SALES: ["projects:view", "projects:create", "leads:view", "leads:manage", "chat:use", "notes:manage"],
  WRITER: ["tasks:execute", "chat:use", "notes:manage"],
  DESIGNER: ["tasks:execute", "chat:use", "notes:manage"],
  EDITOR: ["tasks:execute", "chat:use", "notes:manage"],
  SMM: ["tasks:execute", "chat:use", "notes:manage"],
  VIDEOGRAPHER: ["tasks:execute", "chat:use", "notes:manage"],
};

/** Universal checker — `admin:*` grants everything. */
export function hasPermission(permissions: string[] | undefined, key: string): boolean {
  const p = permissions || [];
  return p.includes("admin:*") || p.includes(key);
}

export function hasAnyPermission(permissions: string[] | undefined, keys: string[]): boolean {
  return keys.some((k) => hasPermission(permissions, k));
}

/** Convenience for server code holding the session. */
export function can(
  session: { permissions?: string[] } | null | undefined,
  key: string
): boolean {
  if (!session) return false;
  return hasPermission(session.permissions, key);
}