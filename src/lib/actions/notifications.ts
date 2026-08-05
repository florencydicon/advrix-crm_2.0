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
