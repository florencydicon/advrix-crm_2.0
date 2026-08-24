"use server";

import { redirect } from "next/navigation";
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
 * Brute-force throttle (best-effort per server instance): max 6 failed
 * attempts per email within 10 minutes, then a cooldown.
 */
const attempts = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;

function throttleCheck(email: string): string | null {
  const key = email.toLowerCase();
  const rec = attempts.get(key);
  const now = Date.now();
  if (!rec) return null;
  if (rec.lockedUntil > now) {
    const mins = Math.ceil((rec.lockedUntil - now) / 60000);
    return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  if (now - rec.firstAt > WINDOW_MS) {
    attempts.delete(key);
  }
  return null;
}

function throttleFail(email: string) {
  const key = email.toLowerCase();
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + WINDOW_MS;
  }
}

function throttleReset(email: string) {
  attempts.delete(email.toLowerCase());
}

export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Email and password are required." };

  const throttled = throttleCheck(email);
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
    throttleFail(email);
    return { error: "Invalid credentials or inactive account." };
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    throttleFail(email);
    return { error: "Invalid email or password." };
  }

  throttleReset(email);

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
