"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

async function ensureLocationColumns() {
  await query(`
    ALTER TABLE attendance
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS location_text TEXT
  `);
}

export async function punchInAction(loc: { latitude: number | null; longitude: number | null; location_text: string | null }) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  await ensureLocationColumns();

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

  await ensureLocationColumns();

  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const existing = await query<{ id: string; punch_in: string | null; punch_out: string | null }>(
    `SELECT id, punch_in, punch_out FROM attendance WHERE user_id = $1 AND date = $2`,
    [session.sub, today]
  );

  const record = existing[0];
  if (!record?.punch_in) {
    return { error: "You haven't punched in today" };
  }

  if (record.punch_out) {
    return { error: "Already punched out today" };
  }

  const punchIn = new Date(record.punch_in);
  const punchOut = new Date(now);
  const hours = (punchOut.getTime() - punchIn.getTime()) / 3600000;

  await query(
    `UPDATE attendance SET punch_out = $1, hours_worked = $2, latitude = $3, longitude = $4, location_text = $5 WHERE id = $6`,
    [now, Math.round(hours * 100) / 100, loc.latitude, loc.longitude, loc.location_text, record.id]
  );

  revalidatePath("/attendance");
  return { ok: true, hoursWorked: Math.round(hours * 100) / 100 };
}
