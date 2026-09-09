"use server";

import { revalidatePath, unstable_noStore } from "next/cache";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { query } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notifyHrManagers } from "@/lib/notifications";
import {
  getAttendanceSettings,
  ensureAttendanceSettingsTable,
  ATTENDANCE_SETTING_KEYS,
  DEFAULT_ATTENDANCE_SETTINGS,
  type AttendanceSettings,
} from "@/lib/data";

async function ensureLocationColumns() {
  try {
    await query(`
      ALTER TABLE attendance
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS location_text TEXT,
        ADD COLUMN IF NOT EXISTS break_start_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS break_end_time TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS total_break_mins INT NOT NULL DEFAULT 0
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

  // If any approved leave covers today, block punch-in
  const hasLeave = await query<{ id: string }>(
    `SELECT id FROM leaves WHERE user_id = $1 AND status = 'approved' AND start_date <= $2 AND end_date >= $2 LIMIT 1`,
    [session.sub, today]
  );
  if (hasLeave[0]) {
    return { error: "You are on approved leave today. Attendance is disabled for this day." };
  }

  const settings = await getAttendanceSettings();

  const punchInTime = new Date();
  const [sh, sm] = settings.shift_start_time.split(":").map(Number);
  const lateThreshold = new Date(punchInTime);
  lateThreshold.setHours(sh || 0, sm || 0, 0, 0);
  lateThreshold.setMinutes(lateThreshold.getMinutes() + settings.late_grace_period_mins);
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

  await logActivity({
    action: "attendance_check_in",
    entityType: "attendance",
    entityId: today,
    metadata: {
      status,
      punch_in: now,
      latitude: loc.latitude,
      longitude: loc.longitude,
      location_text: loc.location_text,
    },
  });

  // HR feed + OS push (via notifications batch) to SUPER_ADMIN + managing PM(s)
  try {
    const time = new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    await notifyHrManagers(session.sub, {
      type: "attendance",
      title: "Clock in",
      body: `${session.name} clocked in at ${time}.`,
      link: "/attendance",
    });
  } catch {}

  revalidatePath("/attendance");
  return { ok: true, status };
}

export async function punchOutAction(loc: { latitude: number | null; longitude: number | null; location_text: string | null }) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const now = new Date();

  // Look for today's punch-in first, then yesterday's (handles midnight crossover).
  let existing = await query<{ id: string; punch_in: string | null; punch_out: string | null; date: string; total_break_mins?: number }>(
    `SELECT id, punch_in, punch_out, date::text AS date, COALESCE(total_break_mins, 0) AS total_break_mins FROM attendance WHERE user_id = $1 AND date = $2`,
    [session.sub, now.toISOString().slice(0, 10)]
  );

  if (!existing[0]?.punch_in) {
    // Check yesterday's record for punch-in around midnight
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    existing = await query<{ id: string; punch_in: string | null; punch_out: string | null; date: string; total_break_mins?: number }>(
      `SELECT id, punch_in, punch_out, date::text AS date, COALESCE(total_break_mins, 0) AS total_break_mins FROM attendance WHERE user_id = $1 AND date = $2`,
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

  const settings = await getAttendanceSettings();

  const punchIn = new Date(record.punch_in);
  const punchOut = now;
  const breaksMins = record.total_break_mins ?? 0;
  // Net hours worked = elapsed time minus lunch/break time.
  const netHours = (punchOut.getTime() - punchIn.getTime()) / 3600000 - breaksMins / 60;
  const netHoursRounded = Math.max(0, Math.round(netHours * 100) / 100);

  // Classify against settings thresholds (net hours).
  let status = "present";
  if (netHoursRounded < settings.minimum_hours_for_half_day) {
    status = breaksMins > 0 || netHoursRounded > 0 ? "absent" : "present";
  } else if (netHoursRounded < settings.minimum_hours_for_full_day) {
    status = "half_day";
  }
  // Keep / adopt "late" label when the punch-in was flagged late and they
  // stayed the full day — compare punch_in against that day's shift start + grace.
  const [sh2, sm2] = settings.shift_start_time.split(":").map(Number);
  const punchLateThreshold = new Date(punchIn);
  punchLateThreshold.setHours(sh2 || 0, sm2 || 0, 0, 0);
  punchLateThreshold.setMinutes(punchLateThreshold.getMinutes() + settings.late_grace_period_mins);
  const punchInLate = punchIn > punchLateThreshold;
  if (status === "present" && punchInLate) status = "late";

  await query(
    `UPDATE attendance SET punch_out = $1, hours_worked = $2, status = $3, latitude = $4, longitude = $5, location_text = $6 WHERE id = $7`,
    [punchOut.toISOString(), netHoursRounded, status, loc.latitude, loc.longitude, loc.location_text, record.id]
  );

  await logActivity({
    action: "attendance_check_out",
    entityType: "attendance",
    entityId: record.date,
    metadata: {
      punch_in: record.punch_in,
      punch_out: punchOut.toISOString(),
      hours_worked: netHoursRounded,
      breaks_mins: breaksMins,
      status,
      latitude: loc.latitude,
      longitude: loc.longitude,
      location_text: loc.location_text,
    },
  });

  try {
    await notifyHrManagers(session.sub, {
      type: "attendance",
      title: "Clock out",
      body: `${session.name} clocked out for the day. (Net Hours: ${netHoursRounded}h)`,
      link: "/attendance",
    });
  } catch {}

  revalidatePath("/attendance");
  return { ok: true, hoursWorked: netHoursRounded, breaksMins };
}

export async function startBreakAction() {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const record = (
    await query<{ id: string; punch_in: string | null; punch_out: string | null; break_start_time: string | null; break_end_time: string | null; total_break_mins: number }>(
      `SELECT id, punch_in, punch_out, break_start_time, break_end_time, COALESCE(total_break_mins, 0) AS total_break_mins
       FROM attendance WHERE user_id = $1 AND date = $2`,
      [session.sub, today]
    )
  )[0];

  if (!record?.punch_in) return { error: "You haven't punched in today" };
  if (record.punch_out) return { error: "You've already punched out" };
  if (record.break_start_time && !record.break_end_time) {
    return { error: "A break is already in progress. Punch out of your break first." };
  }

  await query(
    `UPDATE attendance SET break_start_time = $1 WHERE id = $2`,
    [now.toISOString(), record.id]
  );
  await logActivity({
    action: "lunch_break_start",
    entityType: "attendance",
    entityId: today,
    metadata: { break_start: now.toISOString() },
  });
  try {
    await notifyHrManagers(session.sub, {
      type: "attendance",
      title: "Lunch break started",
      body: `${session.name} started their lunch break.`,
      link: "/attendance",
    });
  } catch {}
  revalidatePath("/attendance");
  return { ok: true };
}

export async function endBreakAction() {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const record = (
    await query<{ id: string; punch_in: string | null; punch_out: string | null; break_start_time: string | null; break_end_time: string | null; total_break_mins: number }>(
      `SELECT id, punch_in, punch_out, break_start_time, break_end_time, COALESCE(total_break_mins, 0) AS total_break_mins
       FROM attendance WHERE user_id = $1 AND date = $2`,
      [session.sub, today]
    )
  )[0];

  if (!record?.break_start_time || record.break_end_time) {
    return { error: "No break in progress" };
  }

  const mins = Math.round((now.getTime() - new Date(record.break_start_time).getTime()) / 60000);
  const total = record.total_break_mins + mins;
  await query(
    `UPDATE attendance SET break_end_time = $1, total_break_mins = $2 WHERE id = $3`,
    [now.toISOString(), total, record.id]
  );
  await logActivity({
    action: "lunch_break_end",
    entityType: "attendance",
    entityId: today,
    metadata: { break_start: record.break_start_time, break_end: now.toISOString(), mins, total_break_mins: total },
  });
  try {
    await notifyHrManagers(session.sub, {
      type: "attendance",
      title: "Lunch break ended",
      body: `${session.name} ended their lunch break. (Total break: ${total}m)`,
      link: "/attendance",
    });
  } catch {}
  revalidatePath("/attendance");
  return { ok: true, breakMins: mins, totalBreakMins: total };
}

export async function updateAttendanceRecordAction(input: {
  user_id: string;
  date: string;
  status?: string;
  hours_worked?: number;
  note?: string | null;
}) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!hasPermission(session.permissions, "attendance:view")) return { error: "Not authorized" };
  const { user_id, date, status, hours_worked, note } = input;
  if (!user_id || !date) return { error: "User and date required" };
  const cleanDate = String(date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return { error: "Invalid date" };
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (status !== undefined) { sets.push(`status = $${vals.length + 1}`); vals.push(status); }
  if (hours_worked !== undefined) { sets.push(`hours_worked = $${vals.length + 1}`); vals.push(hours_worked); }
  if (note !== undefined) { sets.push(`note = $${vals.length + 1}`); vals.push(note); }
  if (sets.length === 0) return { error: "Nothing to update" };
  vals.push(user_id, cleanDate);
  // upsert if not exists
  const existing = await query<{ id: string }>(`SELECT id FROM attendance WHERE user_id = $${vals.length - 1} AND date = $${vals.length}`, [user_id, cleanDate]);
  if (existing[0]) {
    await query(`UPDATE attendance SET ${sets.join(", ")} WHERE user_id = $${vals.length - 1} AND date = $${vals.length}`, vals);
  } else {
    const initStatus = status || "present";
    const initHours = hours_worked ?? 0;
    await query(`INSERT INTO attendance (user_id, date, status, hours_worked) VALUES ($1, $2, $3, $4)`, [user_id, cleanDate, initStatus, initHours]);
    if (note) await query(`UPDATE attendance SET note = $1 WHERE user_id = $2 AND date = $3`, [note, user_id, cleanDate]);
  }
  revalidatePath("/attendance");
  return { ok: true };
}

export async function uploadAttendanceProofAction(input: { user_id: string; date: string; proof_image_url: string }) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  if (!hasPermission(session.permissions, "attendance:view")) return { error: "Not authorized" };
  const { user_id, date, proof_image_url } = input;
  if (!user_id || !date || !proof_image_url) return { error: "Missing fields" };
  const cleanDate = String(date).slice(0, 10);
  await query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS proof_image_url TEXT`);
  const existing = await query<{ id: string }>(`SELECT id FROM attendance WHERE user_id = $1 AND date = $2`, [user_id, cleanDate]);
  if (existing[0]) {
    await query(`UPDATE attendance SET proof_image_url = $1 WHERE id = $2`, [proof_image_url, existing[0].id]);
  } else {
    await query(`INSERT INTO attendance (user_id, date, status, hours_worked, proof_image_url) VALUES ($1, $2, 'present', 0, $3)`, [user_id, cleanDate, proof_image_url]);
  }
  revalidatePath("/attendance");
  return { ok: true };
}

export type { AttendanceSettings } from "@/lib/data";

export async function getAttendanceSettingsAction() {
  unstable_noStore();
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  const settings = await getAttendanceSettings();
  return { ok: true, settings };
}

export async function updateAttendanceSettingsAction(input: Partial<AttendanceSettings>) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated" };
  const isSuperAdmin = hasPermission(session.permissions, "settings:manage");
  if (!isSuperAdmin) return { error: "Only a Super Admin can change attendance settings" };

  await ensureAttendanceSettingsTable();

  const allowed: Partial<AttendanceSettings> = {};
  for (const key of ATTENDANCE_SETTING_KEYS) {
    const v = (input as Record<string, unknown>)[key];
    if (v === undefined || v === null || v === "") continue;
    (allowed as Record<string, unknown>)[key] =
      key === "shift_start_time" || key === "shift_end_time" ? String(v).slice(0, 5) : Math.max(0, Number(v));
  }

  const sane: AttendanceSettings = { ...DEFAULT_ATTENDANCE_SETTINGS, ...allowed };
  await query(
    `UPDATE attendance_settings SET
       shift_start_time = $1,
       shift_end_time = $2,
       late_grace_period_mins = $3,
       minimum_hours_for_half_day = $4,
       minimum_hours_for_full_day = $5,
       monthly_paid_leaves = $6,
       allowed_break_mins = $7,
       updated_by = $8,
       updated_at = now()
     WHERE id = 1`,
    [
      sane.shift_start_time,
      sane.shift_end_time,
      sane.late_grace_period_mins,
      sane.minimum_hours_for_half_day,
      sane.minimum_hours_for_full_day,
      sane.monthly_paid_leaves,
      sane.allowed_break_mins,
      session.sub,
    ]
  );

  revalidatePath("/attendance");
  revalidatePath("/settings");
  revalidatePath("/");
  return { ok: true, settings: sane };
}
