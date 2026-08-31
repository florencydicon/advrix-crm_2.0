"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { validateEmail, validateFullName, validatePassword } from "@/lib/validation";

export async function createUserAction(formData: FormData) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users:manage")) {
    return { error: "Only the Super Admin can manage team members." };
  }

  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role_key = String(formData.get("role_key") || "");
  const phone = String(formData.get("phone") || "").trim() || null;

  const nameErr = validateFullName(full_name);
  if (nameErr) return { error: nameErr };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr };
  if (!role_key) return { error: "Role is required." };
  if (phone && !/^[+\d][\d\s\-()]{7,17}$/.test(phone)) {
    return { error: "Phone number looks invalid. Use country code + digits (e.g. +919773124598)." };
  }

  const roleExists = await query<{ id: string }>(`SELECT id FROM roles WHERE key = $1`, [role_key]);
  if (!roleExists[0]) return { error: "Invalid role." };

  const hash = await bcrypt.hash(password, 10);

  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE lower(email) = lower($1)`, [email]);
  if (existing[0]) return { error: "A user with that email already exists." };

  const rows = await query<{ id: string }>(
    `INSERT INTO users (full_name, email, password_hash, phone, role_id)
     SELECT $1, $2, $3, $4, r.id FROM roles r WHERE r.key = $5 RETURNING id`,
    [full_name, email, hash, phone, role_key]
  );
  if (!rows[0]) return { error: "Invalid role." };

  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string, active: boolean) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users:manage")) {
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
  if (!session || !hasPermission(session.permissions, "users:manage")) {
    return { error: "Not authorized." };
  }
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr };
  const hash = await bcrypt.hash(password, 10);
  await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [
    userId,
    hash,
  ]);
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}

export async function changeRoleAction(userId: string, roleKey: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users:manage")) {
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

export async function deleteUserAction(userId: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users:manage")) {
    return { error: "Not authorized." };
  }
  if (userId === session.sub) return { error: "You cannot delete your own account." };

  // Check not SUPER_ADMIN
  const target = await query<{ role_key: string }>(
    `SELECT r.key AS role_key FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1`,
    [userId]
  );
  if (!target[0]) return { error: "User not found." };
  if (target[0].role_key === "SUPER_ADMIN") return { error: "Cannot delete a Super Admin." };

  // Cascade-delete user data in FK order
  const adminRows = await query<{ id: string }>(
    `SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.key = 'SUPER_ADMIN' LIMIT 1`
  );
  const adminId = adminRows[0]?.id ?? null;

  try { await query(`DELETE FROM task_contributions WHERE user_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM chat_messages WHERE sender_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM notifications WHERE user_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM leaves WHERE user_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM attendance WHERE user_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM notes WHERE author_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM assignments WHERE user_id = $1`, [userId]); } catch {}
  try { await query(`DELETE FROM task_assignees WHERE user_id = $1`, [userId]); } catch {}
  try { await query(`UPDATE projects SET created_by = NULL WHERE created_by = $1`, [userId]); } catch {}
  try { await query(`UPDATE leads SET owner_id = $2 WHERE owner_id = $1`, [userId, adminId]); } catch {}

  // Delete the user
  await query(`DELETE FROM users WHERE id = $1`, [userId]);

  revalidatePath("/team");
  revalidatePath("/settings");
  return {};
}

export async function updateUserPhoneAction(userId: string, phone: string) {
  const session = await getSession();
  if (!session || !hasPermission(session.permissions, "users:manage")) {
    return { error: "Not authorized." };
  }
  const cleaned = phone?.trim() || null;
  if (cleaned && !/^[+\d][\d\s\-()]{7,17}$/.test(cleaned)) {
    return { error: "Phone number looks invalid. Use country code + digits (e.g. +919773124598)." };
  }
  await query(`UPDATE users SET phone = $2 WHERE id = $1`, [userId, cleaned]);
  revalidatePath("/team");
  revalidatePath("/settings");
  return { ok: true };
}
