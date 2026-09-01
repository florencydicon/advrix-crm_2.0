import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getPipelineBoardAction } from "@/lib/actions/pipeline";
import { getTeam } from "@/lib/data";
import ProjectPipeline from "@/components/ProjectPipeline";

export const metadata = { title: "Project Pipeline — Advrix CRM" };

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "projects:view")) redirect("/dashboard");

  const [board, team] = await Promise.all([
    getPipelineBoardAction(),
    getTeam().catch(() => []),
  ]);

  return (
    <div className="h-full p-4 md:p-6">
      <ProjectPipeline initial={board} team={team} />
    </div>
  );
}
