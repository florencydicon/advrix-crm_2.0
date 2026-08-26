"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

async function ensureLocationColumns() {
  try {
    await query(`
      ALTER TABLE attendance
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS location_text TEXT
    `);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remarks TEXT`);
    await query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT,
        locked_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON login_attempts (lower(email), created_at)`);
    // Migration 010: Add VIDEOGRAPHER role + update deliverable_types
    await query(`
      INSERT INTO roles (key, label, permissions, dashboard)
      VALUES ('VIDEOGRAPHER', 'Videographer', ARRAY['tasks:execute'], 'staff')
      ON CONFLICT (key) DO NOTHING
    `);
    await query(`
      UPDATE deliverable_types SET visual_role = 'VIDEOGRAPHER'
      WHERE key = 'video_shoot' AND visual_role = 'EDITOR'
    `);
  } catch {}
}

export async function punchInAction(loc: { latitude: number | null; longitude: number | null; location_text: string | null }) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const existing = await query<{ id: string; punch_in: string | null }>(
    `SELECT id, punch_in FROM attendance WHERE user_id = $1 AND date = $2`,
    [session.sub, today]
  );

  if (existing[0]?.punch_in) {
    return { error: "Already punched in today" };
  }

  const punchInTime = new Date();
  const lateThreshold = new Date();
  lateThreshold.setHours(10, 0, 0, 0);
  const status = punchInTime > lateThreshold ? "late" : "present";

  if (existing[0]) {
    await query(
      `UPDATE attendance SET punch_in = $1, status = $2, latitude = $3, longitude = $4, location_text = $5 WHERE id = $6`,
      [now, status, loc.latitude, loc.longitude, loc.location_text, existing[0].id]
    );
  } else {
    await query(
      `INSERT INTO attendance (user_id, date, punch_in, status, latitude, longitude, location_text) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [session.sub, today, now, status, loc.latitude, loc.longitude, loc.location_text]
    );
  }

  revalidatePath("/attendance");
  return { ok: true, status };
}

export async function punchOutAction(loc: { latitude: number | null; longitude: number | null; location_text: string | null }) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const now = new Date();

  // Look for today's punch-in first, then yesterday's (handles midnight crossover).
  let existing = await query<{ id: string; punch_in: string | null; punch_out: string | null; date: string }>(
    `SELECT id, punch_in, punch_out, date::text AS date FROM attendance WHERE user_id = $1 AND date = $2`,
    [session.sub, now.toISOString().slice(0, 10)]
  );

  if (!existing[0]?.punch_in) {
    // Check yesterday's record for punch-in around midnight
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    existing = await query<{ id: string; punch_in: string | null; punch_out: string | null; date: string }>(
      `SELECT id, punch_in, punch_out, date::text AS date FROM attendance WHERE user_id = $1 AND date = $2`,
      [session.sub, yesterday.toISOString().slice(0, 10)]
    );
  }

  const record = existing[0];
  if (!record?.punch_in) {
    return { error: "You haven't punched in today" };
  }

  if (record.punch_out) {
    return { error: "Already punched out today" };
  }

  const punchIn = new Date(record.punch_in);
  const punchOut = now;
  const hours = (punchOut.getTime() - punchIn.getTime()) / 3600000;

  await query(
    `UPDATE attendance SET punch_out = $1, hours_worked = $2, latitude = $3, longitude = $4, location_text = $5 WHERE id = $6`,
    [punchOut.toISOString(), Math.round(hours * 100) / 100, loc.latitude, loc.longitude, loc.location_text, record.id]
  );

  revalidatePath("/attendance");
  return { ok: true, hoursWorked: Math.round(hours * 100) / 100 };
}
