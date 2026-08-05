"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { validateEmail, validateFullName, validatePassword } from "@/lib/validation";

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Only the Super Admin can manage team members." };
  }

  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role_key = String(formData.get("role_key") || "");

  const nameErr = validateFullName(full_name);
  if (nameErr) return { error: nameErr };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr };
  if (!role_key) return { error: "Role is required." };

  const roleExists = await query<{ id: string }>(`SELECT id FROM roles WHERE key = $1`, [role_key]);
  if (!roleExists[0]) return { error: "Invalid role." };

  const hash = bcrypt.hashSync(password, 10);

  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (existing[0]) return { error: "A user with that email already exists." };

  const rows = await query<{ id: string }>(
    `INSERT INTO users (full_name, email, password_hash, role_id)
     SELECT $1, $2, $3, r.id FROM roles r WHERE r.key = $4 RETURNING id`,
    [full_name, email, hash, role_key]
  );
  if (!rows[0]) return { error: "Invalid role." };

  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Only the Super Admin can manage team members." };
  }
  if (userId === session.sub) return { error: "You cannot deactivate your own account." };

  await query(`UPDATE users SET is_active = $2 WHERE id = $1`, [userId, active]);
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}

export async function resetPasswordAction(userId: string, password: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Not authorized." };
  }
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr };
  const hash = bcrypt.hashSync(password, 10);
  await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [userId, hash]);
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}

export async function changeRoleAction(userId: string, roleKey: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Not authorized." };
  }
  await query(
    `UPDATE users SET role_id = (SELECT id FROM roles WHERE key = $2) WHERE id = $1`,
    [userId, roleKey]
  );
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}
