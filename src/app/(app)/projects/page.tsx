import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPipelineByClient, getTeam } from "@/lib/data";
import ProjectsBoard from "@/components/ProjectsBoard";

export const metadata = { title: "Project Pipeline — Advrix CRM" };

export default async function ProjectsPage() {
  const session = (await getSession())!;
  if (!["PROJECT_MANAGER", "SUPER_ADMIN"].includes(session.role_key)) redirect("/dashboard");

  const [pipeline, team] = await Promise.all([getPipelineByClient(), getTeam()]);

  return (
    <ProjectsBoard
      pipeline={pipeline}
      team={team}
      roleKey={session.role_key}
      userId={session.sub}
    />
  );
}
