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
  // ?q / ?clientId / ?project / ?stage / ?deadline / ?status / ?priority are
  // applied in SQL across the WHOLE dataset — so a search finds a task even
  // when it sits on another page (no need to visit each page manually).
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  const filters = {
    q: one("q") || "",
    clientId: one("clientId") || "",
    project: one("project") || "",
    stage: one("stage") || "",
    deadline: one("deadline") || "",
    status: one("status") || "",
    priority: one("priority") || "",
  };

  const page = Number(one("page")) || 1;
  // Explicit ?size= is honoured for plain browsing. A filtered view always
  // returns every match (server-side fetch-all), so no size juggling is needed.
  const pageSize = Number(one("size")) || 25;

  const [board, team] = await Promise.all([
    getPipelineBoardAction({ page, pageSize, filters }),
    getTeam().catch(() => []),
  ]);

  return (
    <div className="h-full p-4 md:p-6">
      <ProjectPipeline initial={board} team={team} />
    </div>
  );
}
