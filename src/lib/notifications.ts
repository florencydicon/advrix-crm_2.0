import { query } from "@/lib/db";
import type { Notification, NotificationType } from "@/lib/types";

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string | null;
}

export async function createNotification(input: NotificationInput) {
  const { userId, type, title, body = "", link = null } = input;
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, type, title, body, link]
  );
}

/**
 * Batch-create notifications for multiple users in a single query.
 * O(n) → O(1) — critical for 50+ team notifications.
 */
export async function createNotificationsBatch(
  userIds: string[],
  input: Omit<NotificationInput, "userId">
) {
  if (userIds.length === 0) return;
  const { type, title, body = "", link = null } = input;
  const flatValues: any[] = [];
  const placeholders: string[] = [];
  for (let i = 0; i < userIds.length; i++) {
    const off = i * 5;
    placeholders.push(`($${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}, $${off + 5})`);
    flatValues.push(userIds[i], type, title, body, link);
  }
  await query(
    `INSERT INTO notifications (user_id, type, title, body, link) VALUES ${placeholders.join(", ")}`,
    flatValues
  );
}

export async function getNotifications(userId: string, limit = 50): Promise<Notification[]> {
  return query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function getUnreadNotifications(userId: string, limit = 10): Promise<Notification[]> {
  return query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND read = false`,
    [userId]
  );
  return Number(rows[0]?.count || 0);
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const rows = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  return rows[0]?.id ?? null;
}

export async function getUserIdsByRole(roleKey: string): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.key = $1 AND u.is_active = true`,
    [roleKey]
  );
  return rows.map((r) => r.id);
}

/**
 * Get all active user IDs for multiple roles in a single query.
 * O(n) → O(1) for role lookups.
 */
export async function getUserIdsByRoles(roleKeys: string[]): Promise<string[]> {
  if (roleKeys.length === 0) return [];
  const rows = await query<{ id: string }>(
    `SELECT DISTINCT u.id FROM users u JOIN roles r ON r.id = u.role_id
     WHERE r.key = ANY($1) AND u.is_active = true`,
    [roleKeys]
  );
  return rows.map((r) => r.id);
}

export async function getProjectCreatorId(projectId: string): Promise<string | null> {
  const rows = await query<{ created_by: string | null }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0]?.created_by ?? null;
}

/**
 * Notify all active users with the given roles in a SINGLE query.
 * Previously: 1 query per role + 1 INSERT per user (N+1).
 * Now: 1 role lookup + 1 batch INSERT.
 */
export async function notifyRoles(roleKeys: string[], input: Omit<NotificationInput, "userId">) {
  const userIds = await getUserIdsByRoles(roleKeys);
  await createNotificationsBatch(userIds, input);
}

/**
 * Resolve the PROJECT_MANAGER(s) who manage the given employee.
 * An employee is considered managed by a PM if that PM's assigned clients
 * contain work (tasks / assignments) involving the employee. Covers three
 * assignment surfaces so even brand-new members are discovered:
 *   - task_assignees (multi-member)   - tasks.assigned_to (holder)
 *   - assignments (project-level)
 * Returns distinct PM user ids; empty array when none linked.
 */
export async function getManagingPmIdsForUser(userId: string): Promise<string[]> {
  try {
    const rows = await query<{ assigned_pm_id: string }>(
      `SELECT DISTINCT c.assigned_pm_id
       FROM task_assignees ta
       JOIN tasks t ON t.id = ta.task_id
       JOIN projects p ON p.id = t.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE ta.user_id = $1 AND c.assigned_pm_id IS NOT NULL
       UNION
       SELECT DISTINCT c.assigned_pm_id
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE t.assigned_to = $1 AND c.assigned_pm_id IS NOT NULL
       UNION
       SELECT DISTINCT c.assigned_pm_id
       FROM assignments a
       JOIN projects p ON p.id = a.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE a.user_id = $1 AND c.assigned_pm_id IS NOT NULL`,
      [userId]
    );
    return rows.map((r) => r.assigned_pm_id).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Notify HR managers for an attendance/leave event:
 *  - every active SUPER_ADMIN
 *  - plus the specific PROJECT_MANAGER(s) linked to the employee
 * Dedupes, excludes the actor themselves, and is best-effort (never throws).
 */
export async function notifyHrManagers(
  actorUserId: string,
  input: Omit<NotificationInput, "userId">
) {
  try {
    const [superAdminIds, pmIds] = await Promise.all([
      getUserIdsByRole("SUPER_ADMIN"),
      getManagingPmIdsForUser(actorUserId),
    ]);
    const deduped = new Set<string>([...superAdminIds, ...pmIds]);
    deduped.delete(actorUserId);
    if (deduped.size === 0) return;
    await createNotificationsBatch([...deduped], input);
  } catch {
    // attendance notifications are best-effort — do not block the main action
  }
}
