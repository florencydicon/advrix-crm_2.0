import { getSession } from "@/lib/session";
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
