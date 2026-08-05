import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClients, getDeliverableTypes } from "@/lib/data";
import ClientsView from "@/components/ClientsView";

export const metadata = { title: "Clients — Advrix CRM" };

export default async function ClientsPage() {
  const session = (await getSession())!;
  if (!["SALES", "SUPER_ADMIN", "PROJECT_MANAGER"].includes(session.role_key)) redirect("/dashboard");

  const [clients, deliverableTypes] = await Promise.all([getClients(), getDeliverableTypes()]);
  const canCreate = session.role_key === "SALES" || session.role_key === "SUPER_ADMIN";

  return <ClientsView clients={clients} canCreate={canCreate} deliverableTypes={deliverableTypes} />;
}