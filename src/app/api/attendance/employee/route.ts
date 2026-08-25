import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import {
  getEmployeeAttendanceDetail,
  getEmployeeAttendanceSummary,
  getEmployeeLeavesDetail,
} from "@/lib/data";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const isAdmin = session.role_key === "SUPER_ADMIN" || session.role_key === "PROJECT_MANAGER";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!userId || !start || !end) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const [records, summary, leaves] = await Promise.all([
    getEmployeeAttendanceDetail(userId, start, end),
    getEmployeeAttendanceSummary(userId, start, end),
    getEmployeeLeavesDetail(userId, start, end),
  ]);

  return NextResponse.json({ records, summary, leaves });
}
