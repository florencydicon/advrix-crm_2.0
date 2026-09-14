import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getDetailedAnalytics } from "@/lib/data";
import AnalyticsDetailed from "@/components/AnalyticsDetailed";

export const metadata = { title: "Reports — Advrix CRM" };

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "reports:view")) redirect("/dashboard");

  const pmScope = session.role_key === "PROJECT_MANAGER" ? session.sub : null;
  const detailed = await getDetailedAnalytics(pmScope);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-slate-400">Clients, projects, subtasks and employee load — PM / Super Admin view.</p>
      </div>

      <AnalyticsDetailed data={detailed} />
    </div>
  );
}