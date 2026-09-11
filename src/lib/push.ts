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
// Native FCM device tokens (Capacitor app)
// ---------------------------------------------------------------------------

export async function ensureFcmTokensTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        platform TEXT NOT NULL DEFAULT 'android',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_fcm_token_user ON fcm_tokens(user_id)`);
  } catch {}
}

export interface FcmTokenRow {
  user_id: string;
  token: string;
  platform: string;
}

export async function saveFcmToken(userId: string, token: string, platform = "android") {
  if (!token) return;
  await ensureFcmTokensTable();
  await query(
    `INSERT INTO fcm_tokens (user_id, token, platform)
     VALUES ($1,$2,$3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, created_at = now()`,
    [userId, token, platform]
  );
}

export async function removeFcmToken(token: string) {
  await ensureFcmTokensTable();
  await query(`DELETE FROM fcm_tokens WHERE token = $1`, [token]);
}

export async function getFcmTokensForUsers(userIds: string[]): Promise<FcmTokenRow[]> {
  if (userIds.length === 0) return [];
  await ensureFcmTokensTable();
  return query(
    `SELECT user_id, token, platform FROM fcm_tokens WHERE user_id = ANY($1)`,
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
    const tokens = await getFcmTokensForUsers([userId]);
    await dispatchFcmToTokens(tokens, payload);
  } catch {}
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  try {
    const deduped = [...new Set(userIds)];
    if (deduped.length === 0) return;
    const subs = await getSubscriptionsForUsers(deduped);
    await dispatchPushToEndpoints(subs, payload);
    const tokens = await getFcmTokensForUsers(deduped);
    await dispatchFcmToTokens(tokens, payload);
  } catch {}
}

// ---------------------------------------------------------------------------
// Native FCM (Android) sending — HTTP v1 with a service account, or legacy key
// ---------------------------------------------------------------------------

let fcmAccessTokenCache: { token: string; expiresAt: number } | null = null;

interface FcmServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function getFcmServiceAccount(): FcmServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  // Strip wrapping quotes (Vercel .env import may include them)
  const cleaned = raw.trim().replace(/^['"]|['"]$/g, "");
  const tryParse = (s: string): FcmServiceAccount | null => {
    try {
      const parsed = JSON.parse(s) as FcmServiceAccount;
      if (parsed.project_id && parsed.client_email && parsed.private_key) return parsed;
    } catch {}
    return null;
  };
  return tryParse(cleaned) || tryParse(Buffer.from(cleaned, "base64").toString("utf8")) || null;
}

async function getFcmAccessToken(sa: FcmServiceAccount): Promise<string | null> {
  const now = Date.now();
  if (fcmAccessTokenCache && fcmAccessTokenCache.expiresAt > now + 60_000) {
    return fcmAccessTokenCache.token;
  }
  try {
    const { SignJWT, importPKCS8 } = await import("jose");
    const iat = Math.floor(now / 1000);
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(sa.client_email)
      .setSubject(sa.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(await importPKCS8(sa.private_key, "RS256"));

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    fcmAccessTokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    };
    return data.access_token;
  } catch {
    return null;
  }
}

async function dispatchFcmToTokens(tokens: FcmTokenRow[], payload: PushPayload) {
  if (tokens.length === 0) return;

  // Preferred: HTTP v1 via service account.
  const sa = getFcmServiceAccount();
  if (sa) {
    try {
      const access = await getFcmAccessToken(sa);
      if (!access) return;
      await Promise.allSettled(
        tokens.map(async (t) => {
          try {
            const body = {
              message: {
                token: t.token,
                notification: {
                  title: payload.title,
                  body: payload.body,
                },
                android: {
                  priority: "HIGH",
                  notification: {
                    channel_id: "advrix",
                    tag: payload.tag,
                  },
                },
                data: {
                  url: payload.url || "/dashboard",
                },
              },
            };
            const res = await fetch(
              `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${access}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
              }
            );
            if (res.status === 404 || res.status === 400) {
              const text = await res.text().catch(() => "");
              if (text.includes("UNREGISTERED") || text.includes("registration-token-not-registered")) {
                await removeFcmToken(t.token);
              }
            }
          } catch {}
        })
      );
    } catch {}
    return;
  }

  // Fallback: legacy FCM HTTP API with a server key.
  const serverKey = process.env.FCM_SERVER_KEY;
  if (!serverKey) return;
  try {
    await Promise.allSettled(
      tokens.map(async (t) => {
        try {
          const body = {
            to: t.token,
            priority: "high",
            notification: { title: payload.title, body: payload.body, tag: payload.tag || "" },
            data: { url: payload.url || "/dashboard" },
          };
          const res = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              Authorization: `key=${serverKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
          if (res.status === 404) {
            await removeFcmToken(t.token);
          }
        } catch {}
      })
    );
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
