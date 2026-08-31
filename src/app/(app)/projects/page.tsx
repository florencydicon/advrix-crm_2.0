import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getMasterBoardAction } from "@/lib/actions/masterboard";
import { getTeam } from "@/lib/data";
import MasterBoard from "@/components/MasterBoard";
import ClientPortfolioHub from "@/components/ClientPortfolioHub";

export const metadata = { title: "Master Board — Advrix CRM" };

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "projects:view")) redirect("/dashboard");

  const [board, team] = await Promise.all([
    getMasterBoardAction(),
    getTeam().catch(() => []),
  ]);

  const canShare = hasPermission(session.permissions, "projects:manage");

  return (
    <div className="h-full">
      <div className="h-full flex">
        <MasterBoard initial={board} userId={session.sub} team={team} />
        <ClientPortfolioHub clients={board.clients} canShare={canShare} />
      </div>
    </div>
  );
}
