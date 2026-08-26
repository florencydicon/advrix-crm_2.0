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
    return NextResponse.json({ ok: true, message: "Migrations applied: location columns + task remarks." });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
