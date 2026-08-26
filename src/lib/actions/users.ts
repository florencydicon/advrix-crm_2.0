"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
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

  const hash = await bcrypt.hash(password, 10);
  const encrypted = encryptSecret(password);

  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (existing[0]) return { error: "A user with that email already exists." };

  const rows = await query<{ id: string }>(
    `INSERT INTO users (full_name, email, password_hash, password_enc, role_id)
     SELECT $1, $2, $3, $4, r.id FROM roles r WHERE r.key = $5 RETURNING id`,
    [full_name, email, hash, encrypted, role_key]
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
  const hash = await bcrypt.hash(password, 10);
  const encrypted = encryptSecret(password);
  await query(`UPDATE users SET password_hash = $2, password_enc = $3 WHERE id = $1`, [
    userId,
    hash,
    encrypted,
  ]);
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Super Admin only. Returns the account's current password in plaintext when a
 * viewable copy exists (any password set after the viewing feature shipped).
 * Returns password: null for legacy accounts whose original hash is one-way.
 */
export async function getUserPasswordAction(userId: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Not authorized." };
  }
  const rows = await query<{ password_enc: string | null }>(
    `SELECT password_enc FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) return { error: "User not found." };
  if (!rows[0].password_enc) return { ok: true, password: null as string | null };
  const plain = decryptSecret(rows[0].password_enc);
  return { ok: true, password: (plain ?? null) as string | null };
}

export async function changeRoleAction(userId: string, roleKey: string) {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return { error: "Not authorized." };
  }
  const roleExists = await query<{ id: string }>(`SELECT id FROM roles WHERE key = $1`, [roleKey]);
  if (!roleExists[0]) return { error: "Invalid role." };
  await query(
    `UPDATE users SET role_id = $2 WHERE id = $1`,
    [userId, roleExists[0].id]
  );
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}
