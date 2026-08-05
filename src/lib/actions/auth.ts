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

export async function loginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) return { error: "Email and password are required." };

  const rows = await query<AuthUser>(
    `SELECT u.id, u.email, u.full_name, u.password_hash, u.is_active,
            r.key AS role_key, r.label AS role_label, r.dashboard
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE lower(u.email) = lower($1)`,
    [email]
  );

  const user = rows[0];
  if (!user || !user.is_active) return { error: "Invalid credentials or inactive account." };

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return { error: "Invalid email or password." };

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
