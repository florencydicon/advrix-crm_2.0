import { query } from "@/lib/db";
import { getUserIdsByRole, getManagingPmIdsForUser } from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Push subscriptions table
// ---------------------------------------------------------------------------

export async function ensurePushSubscriptionsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id)`);
  } catch {}
}

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(userId: string, sub: PushSubscriptionRow) {
  await ensurePushSubscriptionsTable();
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [userId, sub.endpoint, sub.p256dh, sub.auth]
  );
}

export async function removePushSubscription(endpoint: string) {
  await ensurePushSubscriptionsTable();
  await query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
}

export async function getSubscriptionsForUsers(userIds: string[]): Promise<{ user_id: string; endpoint: string; p256dh: string; auth: string }[]> {
  if (userIds.length === 0) return [];
  await ensurePushSubscriptionsTable();
  return query(
    `SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1)`,
    [userIds]
  );
}

// ---------------------------------------------------------------------------
// VAPID helpers
// ---------------------------------------------------------------------------

function getVapidKeys(): { publicKey: string; privateKey: string; subject: string } | null {
  // Prefer env; fallback to generated keys persisted via ensure? Use env or generated constants.
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    return { publicKey: pub, privateKey: priv, subject: process.env.VAPID_SUBJECT || "mailto:admin@advrix-media.com" };
  }
  // Fallback generated keys (dev) — must match client subscription's applicationServerKey.
  // If env not set, use hard-coded dev pair generated via web-push.
  return {
    publicKey: "BNWlpleq9lb5HCevvphRf440WQMB4p4FuTrZ70DuZNqTLlJYwITfdFD2dcKwbM0TLGu9VIPuP1sBSeSEWfl7w98",
    privateKey: "2hLArbufA1oUwdiezTH5RzpLWrN31Vk5fJ7sMVBWqeA",
    subject: "mailto:admin@advrix-media.com",
  };
}

export function getVapidPublicKey(): string {
  const k = getVapidKeys();
  return k?.publicKey || "";
}

// ---------------------------------------------------------------------------
// Sending (best-effort, never throws)
// ---------------------------------------------------------------------------

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string; // click_action
  tag?: string;
}

async function dispatchPushToEndpoints(
  endpoints: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  if (endpoints.length === 0) return;
  const keys = getVapidKeys();
  if (!keys) return;
  try {
    // Lazy import to avoid bundling web-push on edge/client
    const webPush: any = await import("web-push").then((m) => (m as any).default || m);
    webPush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/logo-mark.png",
      badge: payload.badge || "/logo-mark.png",
      url: payload.url || "/dashboard",
      tag: payload.tag,
    });

    await Promise.allSettled(
      endpoints.map(async (sub) => {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
            data
          );
        } catch (err: any) {
          // 410 Gone = unsubscribed; clean up stale endpoint
          const status = err?.statusCode;
          if (status === 410 || status === 404) {
            try {
              await removePushSubscription(sub.endpoint);
            } catch {}
          }
        }
      })
    );
  } catch {}
}

export async function sendPushNotification(userId: string, payload: PushPayload) {
  try {
    const subs = await getSubscriptionsForUsers([userId]);
    await dispatchPushToEndpoints(subs, payload);
  } catch {}
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  try {
    const deduped = [...new Set(userIds)];
    if (deduped.length === 0) return;
    const subs = await getSubscriptionsForUsers(deduped);
    await dispatchPushToEndpoints(subs, payload);
  } catch {}
}

export async function sendPushToRoles(roleKeys: string[], payload: PushPayload) {
  try {
    const { getUserIdsByRoles } = await import("@/lib/notifications");
    const ids = await getUserIdsByRoles(roleKeys);
    await sendPushToUsers(ids, payload);
  } catch {}
}

export async function sendPushToHrManagers(actorUserId: string, payload: PushPayload) {
  try {
    const [getUserIdsByRoleMod] = await Promise.all([import("@/lib/notifications")]);
    const { getUserIdsByRole } = getUserIdsByRoleMod as any;
    const superAdminIds: string[] = await getUserIdsByRole("SUPER_ADMIN");
    const pmIds: string[] = await getManagingPmIdsForUser(actorUserId);
    const deduped = new Set<string>([...superAdminIds, ...pmIds]);
    deduped.delete(actorUserId);
    if (deduped.size === 0) return;
    await sendPushToUsers([...deduped], payload);
  } catch {}
}
