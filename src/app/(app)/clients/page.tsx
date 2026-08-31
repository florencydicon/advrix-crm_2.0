import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getClientCards, getDeliverableTypes } from "@/lib/data";
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

  const [result, deliverableTypes] = await Promise.all([
    getClientCards({ page, pageSize, search }),
    getDeliverableTypes(),
  ]);
  const canCreate = hasPermission(session.permissions, "projects:create");
  const canDelete = hasPermission(session.permissions, "projects:delete");

  return (
    <ClientsView
      clients={result.items}
      canCreate={canCreate}
      canDelete={canDelete}
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
