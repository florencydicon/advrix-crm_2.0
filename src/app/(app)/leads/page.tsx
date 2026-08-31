import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getLeads, getLeadStats } from "@/lib/data";
import LeadsView from "@/components/LeadsView";

export const metadata = { title: "Sales Leads — Advrix CRM" };

export default async function LeadsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "leads:view")) {
    redirect("/dashboard");
  }

  // Data isolation happens here: SALES sees only their own leads.
  const ownerId = session.role_key === "SALES" ? session.sub : null;
  const [leads, stats] = await Promise.all([getLeads(ownerId), getLeadStats(ownerId)]);

  return <LeadsView leads={leads} stats={stats} roleKey={session.role_key} />;
}
