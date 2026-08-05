import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBoard, getTeam } from "@/lib/data";
import ProjectsBoard from "@/components/ProjectsBoard";

export const metadata = { title: "Project Pipeline — Advrix CRM" };

export default async function ProjectsPage() {
  const session = (await getSession())!;
  if (!["PROJECT_MANAGER", "SUPER_ADMIN"].includes(session.role_key)) redirect("/dashboard");

  const [projects, team] = await Promise.all([getBoard(), getTeam()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Project Pipeline</h1>
        <p className="text-sm text-slate-500">
          Every campaign, its automated workflow groups, and live task status. The next step auto-triggers when the current one completes.
        </p>
      </div>
      <ProjectsBoard projects={projects} team={team} roleKey={session.role_key} />
    </div>
  );
}