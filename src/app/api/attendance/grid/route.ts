import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasAnyPermission } from "@/lib/permissions";
import { getAttendanceGrid, getLeaveReport } from "@/lib/data";
import { query } from "@/lib/db";
import type { UserRow } from "@/lib/types";

function monthRange(month: number, year: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const isAdmin =
    hasAnyPermission(session.permissions, ["attendance:view", "leaves:approve"]) ||
    session.role_key === "SUPER_ADMIN" ||
    session.role_key === "PROJECT_MANAGER";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const month = Math.min(12, Math.max(1, Number(searchParams.get("month") || new Date().getMonth() + 1)));
  const year = Math.min(2100, Math.max(2020, Number(searchParams.get("year") || new Date().getFullYear())));
  const { start, end } = monthRange(month, year);

  const [grid, leaves, users] = await Promise.all([
    getAttendanceGrid(start, end).catch(() => [] as Awaited<ReturnType<typeof getAttendanceGrid>>),
    getLeaveReport(start, end).catch(() => [] as Awaited<ReturnType<typeof getLeaveReport>>),
    query<UserRow>(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.phone, u.designation, u.permissions, u.created_at, r.key AS role_key, r.label AS role_label
       FROM users u JOIN roles r ON r.id = u.role_id WHERE u.is_active = true ORDER BY u.full_name ASC`
    ).catch(() => [] as UserRow[]),
  ]);

  return NextResponse.json({ grid, leaves, users, month, year, start, end });
}
