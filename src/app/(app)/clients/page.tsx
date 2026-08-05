import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClientsPaginated, getDeliverableTypes } from "@/lib/data";
import ClientsView from "@/components/ClientsView";

export const metadata = { title: "Clients — Advrix CRM" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = (await getSession())!;
  if (!["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"].includes(session.role_key)) redirect("/dashboard");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const pageSize = 25;

  const [result, deliverableTypes] = await Promise.all([
    getClientsPaginated({ page, pageSize, search }),
    getDeliverableTypes(),
  ]);
  const canCreate = session.role_key === "SALES" || session.role_key === "SUPER_ADMIN";

  return (
    <ClientsView
      clients={result.items}
      canCreate={canCreate}
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
