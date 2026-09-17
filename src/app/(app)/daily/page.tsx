import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMyDailyLogsAction } from "@/lib/actions/dailyLogs";
import DailyTodo from "@/components/DailyTodo";

export default async function DailyPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const res = await getMyDailyLogsAction();
  const logs = res.ok ? res.logs : [];
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Daily Work Log</h1>
        <p className="text-sm text-slate-400">Date-wise notes for everyone — record what you worked on, then Copy or Share directly to WhatsApp.</p>
      </div>
      <DailyTodo initialLogs={logs} userName={session.name} />
    </div>
  );
}
