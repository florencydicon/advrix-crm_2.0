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

export async function getProjectCreatorId(projectId: string): Promise<string | null> {
  const rows = await query<{ created_by: string | null }>(
    `SELECT created_by FROM projects WHERE id = $1`,
    [projectId]
  );
  return rows[0]?.created_by ?? null;
}

export async function notifyRoles(roleKeys: string[], input: Omit<NotificationInput, "userId">) {
  for (const roleKey of roleKeys) {
    const userIds = await getUserIdsByRole(roleKey);
    for (const userId of userIds) {
      await createNotification({ ...input, userId });
    }
  }
}
