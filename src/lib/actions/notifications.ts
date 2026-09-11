"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function markNotificationReadAction(notificationId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  await query(
    `UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2`,
    [notificationId, session.sub]
  );
  revalidatePath("/updates");
  return { ok: true };
}

export async function markAllNotificationsReadAction() {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  await query(
    `UPDATE notifications SET read = true WHERE user_id = $1 AND read = false`,
    [session.sub]
  );
  revalidatePath("/updates");
  return { ok: true };
}

/**
 * Super Admin only — broadcast a custom announcement (e.g. "Office closed").
 * Creates an in-app notification for every recipient AND fires mobile + web
 * push via createNotificationsBatch (FCM + VAPID), so it lands in the bell,
 * the Updates page, and on phones.
 */
export async function sendAnnouncementAction(input: {
  title: string;
  body: string;
  mode: "all" | "selected";
  userIds?: string[];
}) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." } as const;
  const perms = session.permissions || [];
  const isSuperAdmin = session.role_key === "SUPER_ADMIN" || perms.includes("admin:*");
  if (!isSuperAdmin) return { error: "Only Super Admin can send announcements." } as const;

  const title = String(input.title || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const body = String(input.body || "").trim().slice(0, 500);
  if (!title || title.length < 3) return { error: "Title too short (min 3 characters)." } as const;
  if (!body) return { error: "Message cannot be empty." } as const;

  let recipientIds: string[];
  if (input.mode === "all") {
    const rows = await query<{ id: string }>(`SELECT id FROM users WHERE is_active = true`);
    recipientIds = rows.map((r) => r.id);
  } else {
    const ids = [...new Set((input.userIds || []).filter(Boolean))].slice(0, 500);
    if (ids.length === 0) return { error: "Select at least one member." } as const;
    const rows = await query<{ id: string }>(
      `SELECT id FROM users WHERE id = ANY($1) AND is_active = true`,
      [ids]
    );
    recipientIds = rows.map((r) => r.id);
    if (recipientIds.length === 0) return { error: "No active members selected." } as const;
  }

  const { createNotificationsBatch } = await import("@/lib/notifications");
  await createNotificationsBatch(recipientIds, {
    type: "system",
    title,
    body: `${body} — ${session.name}`,
    link: "/updates",
  });
  revalidatePath("/updates");
  return { ok: true as const, count: recipientIds.length };
}
