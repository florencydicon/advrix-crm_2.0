import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import {
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceStats,
  getMyLeaves,
  getLeaveBalance,
  getAllLeaves,
  getAttendanceReport,
  getLeaveReport,
} from "@/lib/data";
import AttendanceView from "@/components/AttendanceView";

export const metadata = { title: "Attendance & Leave — Advrix CRM" };

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
  } catch {}
}

function monthRange(month: number, year: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`,
  };
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const session = (await getSession())!;
  const isAdmin = session.role_key === "SUPER_ADMIN";

  await ensureLocationColumns();

  const params = await searchParams;
  const now = new Date();
  const month = Math.min(12, Math.max(1, Number(params.month) || now.getMonth() + 1));
  const year = Math.min(2100, Math.max(2020, Number(params.year) || now.getFullYear()));
  const { start, end } = monthRange(month, year);

  const [todayRecord, history, stats, myLeaves, leaveBalance, allLeaves, pendingLeaves] = await Promise.all([
    getTodayAttendance(session.sub),
    getAttendanceHistory(session.sub),
    getAttendanceStats(),
    getMyLeaves(session.sub),
    getLeaveBalance(session.sub),
    isAdmin ? getAllLeaves({}) : Promise.resolve([]),
    isAdmin ? getAllLeaves({ status: "pending" }) : Promise.resolve([]),
  ]);

  // Admin-only monthly reports.
  const [attendanceReport, leaveReport] = isAdmin
    ? await Promise.all([getAttendanceReport(start, end), getLeaveReport(start, end)])
    : [[], []];

  return (
    <AttendanceView
      userName={session.name}
      userRole={session.role_label}
      todayRecord={todayRecord}
      history={history}
      stats={stats}
      isAdmin={isAdmin}
      myLeaves={myLeaves}
      leaveBalance={leaveBalance}
      allLeaves={allLeaves}
      pendingLeaves={pendingLeaves}
      reportMonth={month}
      reportYear={year}
      attendanceReport={attendanceReport}
      leaveReport={leaveReport}
    />
  );
}
