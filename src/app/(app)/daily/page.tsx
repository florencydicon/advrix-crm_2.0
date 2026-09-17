import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMyDailyLogsAction, getAllDailyLogsAction } from "@/lib/actions/dailyLogs";
import DailyTodo from "@/components/DailyTodo";
import AdminDailyLogReport from "@/components/AdminDailyLogReport";

export default async function DailyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const isSuperAdmin = session.role_key === "SUPER_ADMIN";
  if (isSuperAdmin) {
    const res = await getAllDailyLogsAction();
    const logs = res.ok ? res.logs : [];
    return (
      <div className="w-full max-w-none space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Daily Work Log Report</h1>
          <p className="text-sm text-slate-400">Monitoring — all users&apos; date-wise logs. Filter by date/user and Export to Excel/PDF.</p>
        </div>
        <AdminDailyLogReport initialLogs={logs} />
      </div>
    );
  }
  const res = await getMyDailyLogsAction();
  const logs = res.ok ? res.logs : [];
  return (
    <div className="w-full max-w-none space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Daily Work Log</h1>
        <p className="text-sm text-slate-400">Date-wise notes for everyone — record what you worked on, then Copy or Share directly to WhatsApp.</p>
      </div>
      <DailyTodo initialLogs={logs} userName={session.name} />
    </div>
  );
}
