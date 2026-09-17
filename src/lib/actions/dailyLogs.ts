"use server";

import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { getSession } from "@/lib/session";

export interface DailyLog {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  created_at: string;
  updated_at: string;
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS daily_work_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      content TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_work_logs_user ON daily_work_logs(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_work_logs_date ON daily_work_logs(entry_date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_work_logs_user_date ON daily_work_logs(user_id, entry_date)`);
}

export async function getMyDailyLogsAction(): Promise<{ ok: boolean; logs: DailyLog[]; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, logs: [], error: "Not authorized." };
  await ensureTable();
  const rows = await query<DailyLog>(
    `SELECT id, user_id, entry_date::text AS entry_date, content, created_at::text AS created_at, updated_at::text AS updated_at
     FROM daily_work_logs WHERE user_id = $1 ORDER BY entry_date DESC, updated_at DESC`,
    [session.sub]
  );
  return { ok: true, logs: rows };
}

export async function upsertDailyLogAction(entryDate: string, content: string): Promise<{ ok: boolean; log?: DailyLog; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  const cleanDate = String(entryDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return { ok: false, error: "Invalid date." };
  const cleanContent = String(content || "").trim();
  if (!cleanContent) return { ok: false, error: "Content cannot be empty." };
  if (cleanContent.length > 5000) return { ok: false, error: "Content too long (max 5000)." };
  await ensureTable();
  // Upsert: one row per user per date. If exists, update; else insert.
  const existing = await query<DailyLog>(`SELECT id FROM daily_work_logs WHERE user_id = $1 AND entry_date = $2`, [session.sub, cleanDate]);
  if (existing.length > 0) {
    const rows = await query<DailyLog>(
      `UPDATE daily_work_logs SET content = $3, updated_at = now() WHERE user_id = $1 AND entry_date = $2
       RETURNING id, user_id, entry_date::text AS entry_date, content, created_at::text AS created_at, updated_at::text AS updated_at`,
      [session.sub, cleanDate, cleanContent]
    );
    revalidatePath("/daily");
    revalidatePath("/dashboard");
    return { ok: true, log: rows[0] };
  }
  const rows = await query<DailyLog>(
    `INSERT INTO daily_work_logs (user_id, entry_date, content) VALUES ($1, $2, $3)
     RETURNING id, user_id, entry_date::text AS entry_date, content, created_at::text AS created_at, updated_at::text AS updated_at`,
    [session.sub, cleanDate, cleanContent]
  );
  revalidatePath("/daily");
  revalidatePath("/dashboard");
  return { ok: true, log: rows[0] };
}

export async function deleteDailyLogAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authorized." };
  await ensureTable();
  const rows = await query<{ user_id: string }>(`SELECT user_id FROM daily_work_logs WHERE id = $1`, [id]);
  if (!rows[0]) return { ok: false, error: "Not found." };
  const isOwner = rows[0].user_id === session.sub;
  const isSuperAdmin = session.role_key === "SUPER_ADMIN";
  if (!isOwner && !isSuperAdmin) return { ok: false, error: "Not authorized." };
  await query(`DELETE FROM daily_work_logs WHERE id = $1`, [id]);
  revalidatePath("/daily");
  revalidatePath("/dashboard");
  return { ok: true };
}

export interface AdminDailyLog extends DailyLog {
  full_name: string;
  role_label: string | null;
  email: string | null;
}

export async function getAllDailyLogsAction(): Promise<{ ok: boolean; logs: AdminDailyLog[]; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, logs: [], error: "Not authorized." };
  if (session.role_key !== "SUPER_ADMIN") return { ok: false, logs: [], error: "Only Super Admin can view all logs." };
  await ensureTable();
  const rows = await query<AdminDailyLog>(
    `SELECT d.id, d.user_id, d.entry_date::text AS entry_date, d.content, d.created_at::text AS created_at, d.updated_at::text AS updated_at,
            u.full_name, r.label AS role_label, u.email
     FROM daily_work_logs d
     JOIN users u ON u.id = d.user_id
     LEFT JOIN roles r ON r.id = u.role_id
     ORDER BY d.entry_date DESC, d.updated_at DESC`
  );
  return { ok: true, logs: rows };
}
