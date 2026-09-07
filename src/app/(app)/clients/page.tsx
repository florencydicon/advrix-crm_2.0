import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getClientCards, getDeliverableTypes, getTeam } from "@/lib/data";
import type { UserRow } from "@/lib/types";
import ClientsView from "@/components/ClientsView";

export const metadata = { title: "Clients — Advrix CRM" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "projects:view")) redirect("/dashboard");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const pageSize = 24;

  const pmScope = session.role_key === "PROJECT_MANAGER" ? session.sub : null;
  const [result, deliverableTypes, team] = await Promise.all([
    getClientCards({ page, pageSize, search }, pmScope),
    getDeliverableTypes(),
    getTeam().catch(() => [] as UserRow[]),
  ]);
  const canCreate = hasPermission(session.permissions, "projects:create");
  const canDelete = hasPermission(session.permissions, "projects:delete");
  const isSuperAdmin = session.role_key === "SUPER_ADMIN" || hasPermission(session.permissions, "admin:*");
  const pms = (team || []).filter((u) => u.role_key === "PROJECT_MANAGER");

  return (
    <ClientsView
      clients={result.items}
      canCreate={canCreate}
      canDelete={canDelete}
      isSuperAdmin={isSuperAdmin}
      pms={pms}
      deliverableTypes={deliverableTypes}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
      totalPages={result.totalPages}
      search={search}
      basePath="/clients"
    />
  );
}
