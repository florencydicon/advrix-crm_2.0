"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSessionToken, clearSessionCookie, getSession, setSessionCookie } from "@/lib/session";

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  is_active: boolean;
  role_key: string;
  role_label: string;
  dashboard: string;
}

export interface LoginState {
  error?: string;
}

/**
 * Database-backed brute-force throttle. Survives cold starts and works
 * across all server instances. Max 6 failed attempts per 10-minute window.
 */
const WINDOW_SECONDS = 600; // 10 minutes
const MAX_ATTEMPTS = 6;
const LOCK_SECONDS = 600;

async function throttleCheck(email: string, _ip: string): Promise<string | null> {
  try {
    // Clean old records periodically
    await query(`DELETE FROM login_attempts WHERE created_at < now() - interval '1 hour'`);

    const rows = await query<{ attempt_count: string; locked_until: string | null }>(
      `SELECT
         COUNT(*)::text AS attempt_count,
         MAX(locked_until)::text AS locked_until
       FROM login_attempts
       WHERE lower(email) = lower($1)
         AND created_at > now() - interval '${WINDOW_SECONDS} seconds'`,
      [email]
    );

    const rec = rows[0];
    if (!rec) return null;

    if (rec.locked_until) {
      const lockedUntil = new Date(rec.locked_until).getTime();
      const now = Date.now();
      if (lockedUntil > now) {
        const mins = Math.ceil((lockedUntil - now) / 60000);
        return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
      }
    }

    return null;
  } catch {
    // Table may not exist yet — allow login, throttle is best-effort
    return null;
  }
}

async function throttleFail(email: string, ip: string) {
  try {
    // Record this attempt
    await query(
      `INSERT INTO login_attempts (email, ip_address) VALUES (lower($1), $2)`,
      [email, ip]
    );

    // Count recent attempts and lock if exceeded
    const rows = await query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt
       FROM login_attempts
       WHERE lower(email) = lower($1)
         AND created_at > now() - interval '${WINDOW_SECONDS} seconds'`,
      [email]
    );
    const count = Number(rows[0]?.cnt || 0);
    if (count >= MAX_ATTEMPTS) {
      await query(
        `UPDATE login_attempts SET locked_until = now() + interval '${LOCK_SECONDS} seconds'
         WHERE lower(email) = lower($1)
           AND locked_until IS NULL
           AND created_at > now() - interval '${WINDOW_SECONDS} seconds'`,
        [email]
      );
    }
  } catch {
    // Table may not exist yet — throttle is best-effort
  }
}

async function throttleReset(email: string) {
  try {
    await query(`DELETE FROM login_attempts WHERE lower(email) = lower($1)`, [email]);
  } catch {
    // Table may not exist yet
  }
}

export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  // Read IP from request headers (server-side) — never trust client-submitted IP.
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  const ip = (forwardedFor?.split(",")[0]?.trim()) || hdrs.get("x-real-ip") || "unknown";

  if (!email || !password) return { error: "Email and password are required." };

  try {
    const throttled = await throttleCheck(email, ip);
    if (throttled) return { error: throttled };

    const rows = await query<AuthUser>(
      `SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active,
              r.key AS role_key, r.label AS role_label, r.dashboard
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE lower(u.email) = lower($1)`,
      [email]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      await throttleFail(email, ip);
      return { error: "Invalid credentials or inactive account." };
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password_hash);
    } catch {
      return { error: "Invalid email or password." };
    }
    if (!ok) {
      await throttleFail(email, ip);
      return { error: "Invalid email or password." };
    }

    await throttleReset(email);

    const token = await createSessionToken({
      sub: user.id,
      email: user.email,
      name: user.full_name,
      role_key: user.role_key,
      role_label: user.role_label,
      dashboard: user.dashboard,
    });
    await setSessionCookie(token);
    redirect("/dashboard");
  } catch (e: any) {
    if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
    return { error: "Login failed. Please try again." };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function requireRole(...roles: string[]) {
  const session = await getSession();
  if (!session) return null;
  if (roles.length && !roles.includes(session.role_key)) return null;
  return session;
}
