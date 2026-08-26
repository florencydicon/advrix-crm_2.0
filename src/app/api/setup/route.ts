import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.role_key !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

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

    return NextResponse.json({ ok: true, message: "Migrations applied: location columns, task remarks, login_attempts, videographer role." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
