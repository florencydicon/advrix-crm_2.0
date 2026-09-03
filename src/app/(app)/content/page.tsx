import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasAnyPermission } from "@/lib/permissions";
import { getContentBoardAction } from "@/lib/actions/pipeline";
import { getTeam } from "@/lib/data";
import ContentHub from "@/components/ContentHub";

export const metadata = { title: "Content Management — Advrix CRM" };

export default async function ContentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasAnyPermission(session.permissions, ["tasks:execute", "tasks:manage", "tasks:review"])) {
    redirect("/dashboard");
  }

  const [board, team] = await Promise.all([
    getContentBoardAction(),
    getTeam().catch(() => []),
  ]);

  return (
    <div className="h-full p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight">Content Management</h1>
        <p className="text-sm text-slate-400">
          Every content deliverable across clients — {board.active.length} open, {board.completed.length} done.
        </p>
      </div>
      <ContentHub
        tasks={[...board.active, ...board.completed]}
        team={team}
        roleKey={session.role_key}
        userId={session.sub}
        permissions={session.permissions}
      />
    </div>
  );
}
