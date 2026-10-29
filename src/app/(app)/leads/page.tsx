import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getLeads, getLeadStats } from "@/lib/data";
import LeadsView from "@/components/LeadsView";

export const metadata = { title: "Sales Leads — Advrix CRM" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; dateField?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "leads:view")) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const rawField = sp.dateField || "created_at";
  const dateField =
    rawField === "created_at" || rawField === "next_follow_up" ? rawField : "created_at";
  // YYYY-MM-DD only; ignore malformed values.
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const dateFrom = dateRe.test(sp.from || "") ? (sp.from as string) : undefined;
  const dateTo = dateRe.test(sp.to || "") ? (sp.to as string) : undefined;

  // Data isolation: SALES sees only their own leads; PROJECT_MANAGER only
  // leads of clients assigned to them (converted). Others see all leads.
  const ownerId = session.role_key === "SALES" ? session.sub : null;
  const clientScopeId = session.role_key === "PROJECT_MANAGER" ? session.sub : null;
  const [leads, stats] = await Promise.all([
    getLeads(ownerId, clientScopeId, dateFrom, dateTo, dateField),
    getLeadStats(ownerId, clientScopeId, dateFrom, dateTo, dateField),
  ]);

  return (
    <LeadsView
      leads={leads}
      stats={stats}
      roleKey={session.role_key}
      dateFrom={dateFrom}
      dateTo={dateTo}
      dateField={dateField}
    />
  );
}
