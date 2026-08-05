import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getBoard, getTeam } from "@/lib/data";
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
  const pageSize = 20;

  const [allProjects, team] = await Promise.all([getBoard(), getTeam()]);

  let filtered = allProjects;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.name.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q)
    );
  }
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const projects = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Project Pipeline</h1>
        <p className="text-sm text-slate-500">
          Every campaign, its automated workflow groups, and live task status.
        </p>
      </div>
      <ProjectsBoard
        projects={projects}
        team={team}
        roleKey={session.role_key}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        search={search}
        statusFilter={status}
      />
    </div>
  );
}
