import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getPipelineBoardAction } from "@/lib/actions/pipeline";
import { getTeam } from "@/lib/data";
import ProjectPipeline from "@/components/ProjectPipeline";

export const metadata = { title: "Project Pipeline — Advrix CRM" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "projects:view")) redirect("/dashboard");

  // ?page / ?size make the pipeline deep-linkable and server-paginated.
  const sp = await searchParams;
  const page = Number(typeof sp.page === "string" ? sp.page : 1) || 1;
  const pageSize = Number(typeof sp.size === "string" ? sp.size : 25) || 25;

  const [board, team] = await Promise.all([
    getPipelineBoardAction({ page, pageSize }),
    getTeam().catch(() => []),
  ]);

  return (
    <div className="h-full p-4 md:p-6">
      <ProjectPipeline initial={board} team={team} />
    </div>
  );
}
