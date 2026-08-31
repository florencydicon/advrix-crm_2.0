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
    .setExpirationTime("12h")
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
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  // Verify user is still active — catches deactivations before JWT expires.
  try {
    const rows = await query<{ is_active: boolean }>(
      `SELECT is_active FROM users WHERE id = $1`,
      [payload.sub]
    );
    if (rows.length === 0 || !rows[0].is_active) return null;
    // Backfill current effective permissions + role from the DB so role /
    // permission changes apply without waiting for the JWT to expire.
    const perm = await query<{ permissions: string[] | null }>(
      `SELECT COALESCE(u.permissions, r.permissions) AS permissions
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [payload.sub]
    );
    if (perm[0]) {
      payload.permissions = perm[0].permissions || [];
    }
  } catch {
    // DB check is best-effort — if it fails, let the JWT session through.
  }
  return payload;
}