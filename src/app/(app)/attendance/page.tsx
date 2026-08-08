import { getSession } from "@/lib/session";
import {
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceStats,
  getMyLeaves,
  getLeaveBalance,
  getAllLeaves,
} from "@/lib/data";
import AttendanceView from "@/components/AttendanceView";

export const metadata = { title: "Attendance & Leave — Advrix CRM" };

export default async function AttendancePage() {
const session = (await getSession())!;
  const isAdmin = session.role_key === "SUPER_ADMIN";

  const [todayRecord, history, stats, myLeaves, leaveBalance, allLeaves, pendingLeaves] = await Promise.all([
    getTodayAttendance(session.sub),
    getAttendanceHistory(session.sub),
    getAttendanceStats(),
    getMyLeaves(session.sub),
    getLeaveBalance(session.sub),
    isAdmin ? getAllLeaves({}) : Promise.resolve([]),
    isAdmin ? getAllLeaves({ status: "pending" }) : Promise.resolve([]),
  ]);

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
    />
  );
}