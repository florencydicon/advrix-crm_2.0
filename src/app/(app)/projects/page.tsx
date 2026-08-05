import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProjectsPaginated, getTeam } from "@/lib/data";
import ProjectsBoard from "@/components/ProjectsBoard";

export const metadata = { title: "Project Pipeline — Advrix CRM" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const session = (await getSession())!;
  if (!["PROJECT_MANAGER", "SUPER_ADMIN"].includes(session.role_key)) redirect("/dashboard");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const status = params.status || "";
  const pageSize = 25;

  const [result, team] = await Promise.all([
    getProjectsPaginated({ page, pageSize, search, status }),
    getTeam(),
  ]);

  const filterTabs = [
    { key: "", label: "All", count: result.total },
    { key: "pending_approval", label: "Awaiting Approval" },
    { key: "in_progress", label: "In Production" },
    { key: "completed", label: "Completed" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <ProjectsBoard
      projects={result.items}
      team={team}
      roleKey={session.role_key}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
      totalPages={result.totalPages}
      search={search}
      statusFilter={status}
      filterTabs={filterTabs}
      basePath="/projects"
    />
  );
}
