import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getLeads, getLeadStats } from "@/lib/data";
import LeadsView from "@/components/LeadsView";

export const metadata = { title: "Sales Leads — Advrix CRM" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "leads:view")) {
    redirect("/dashboard");
  }

  // ?date=today | week | last_month | (empty = all)
  const sp = await searchParams;
  const dateFilter = ["today", "week", "last_month"].includes(sp.date || "")
    ? (sp.date as "today" | "week" | "last_month")
    : "";

  // Data isolation: SALES sees only their own leads; PROJECT_MANAGER only
  // leads of clients assigned to them (converted). Others see all leads.
  const ownerId = session.role_key === "SALES" ? session.sub : null;
  const clientScopeId = session.role_key === "PROJECT_MANAGER" ? session.sub : null;
  const [leads, stats] = await Promise.all([
    getLeads(ownerId, clientScopeId, dateFilter),
    getLeadStats(ownerId, clientScopeId, dateFilter),
  ]);

  return <LeadsView leads={leads} stats={stats} roleKey={session.role_key} dateFilter={dateFilter} />;
}
