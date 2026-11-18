import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import ExcelBackupPanel from "@/components/ExcelBackupPanel";

export const metadata = { title: "Data Backup — Advrix CRM" };

export default async function BackupPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role_key !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Data Backup &amp; Sync</h1>
        <p className="text-sm text-slate-400">
          One-click Excel backup of the whole CRM — edit it and sync your changes back.
        </p>
      </div>
      <ExcelBackupPanel />
    </div>
  );
}
