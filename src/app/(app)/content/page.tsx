import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasAnyPermission } from "@/lib/permissions";
import { getContentItemsAction } from "@/lib/actions/content";
import { getClients, getTeam } from "@/lib/data";
import ContentHub from "@/components/ContentHub";

export const metadata = { title: "Content Management — Advrix CRM" };

export default async function ContentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasAnyPermission(session.permissions, ["tasks:execute", "tasks:manage", "tasks:review"])) {
    redirect("/dashboard");
  }

  const [board, clients, team] = await Promise.all([
    getContentItemsAction(),
    getClients().catch(() => []),
    getTeam().catch(() => []),
  ]);

  return (
    <div className="h-full p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Content Management</h1>
        <p className="text-sm text-slate-400">
          Standalone content workspace — {board.items.filter((i) => i.status !== "completed").length} active,{" "}
          {board.items.filter((i) => i.status === "completed").length} in history.
        </p>
      </div>
      <ContentHub
        items={board.items}
        clients={clients}
        team={team}
        canManage={board.canManage}
        canEdit={board.canEdit}
      />
    </div>
  );
}
