import "@/lib/env";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getSigningSecret } from "@/lib/constants";
import { query } from "@/lib/db";

const SESSION_COOKIE = SESSION_COOKIE_NAME;
const secret = getSigningSecret();

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role_key: string;
  role_label: string;
  dashboard: string;
  permissions?: string[];
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Long-enough to skip the DB on most navigations/actions (each round trip here
// is ~100ms), short-enough that deactivation enforcement stays tight. Admin
// toggles also call invalidateSessionCache() explicitly for immediate effect.
const SESSION_CACHE_TTL_MS = 30_000;
const sessionCache = new Map<string, { active: boolean; permissions: string[]; at: number }>();

/** Force a re-check of the live user row (deactivate, role/permission change). */
export function invalidateSessionCache(userId: string): void {
  sessionCache.delete(userId);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  // Verify user is still active + backfill current effective permissions / role.
  // Cached briefly per-instance so heavy polling doesn't hammer the DB; a 10s
  // staleness window is fine for deactivation enforcement.
  const cached = sessionCache.get(payload.sub);
  if (cached && Date.now() - cached.at < SESSION_CACHE_TTL_MS) {
    if (!cached.active) return null;
    payload.permissions = cached.permissions;
    return payload;
  }
  try {
    const rows = await query<{ is_active: boolean; permissions: string[] | null }>(
      `SELECT u.is_active, COALESCE(u.permissions, r.permissions) AS permissions
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    const row = rows[0];
    const result = { active: !!row?.is_active, permissions: (row?.permissions || []) as string[] };
    sessionCache.set(payload.sub, { ...result, at: Date.now() });
    if (!result.active) return null;
    payload.permissions = result.permissions;
  } catch {
    // DB check is best-effort — if it fails, let the JWT session through.
  }
  return payload;
}