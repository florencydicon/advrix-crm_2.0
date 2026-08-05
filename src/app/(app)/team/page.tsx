import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTeamPaginated, getRoles } from "@/lib/data";
import TeamView from "@/components/TeamView";

export const metadata = { title: "Team — Advrix CRM" };

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}) {
  const session = (await getSession())!;
  if (session.role_key !== "SUPER_ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";
  const role = params.role || "";
  const pageSize = 25;

  const [result, roles] = await Promise.all([
    getTeamPaginated({ page, pageSize, search, roleKey: role }),
    getRoles(),
  ]);

  const filterTabs = [
    { key: "", label: "All", count: result.total },
    ...roles.map((r) => ({ key: r.key, label: r.label })),
  ];

  return (
    <TeamView
      users={result.items}
      roles={roles}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
      totalPages={result.totalPages}
      search={search}
      roleFilter={role}
      filterTabs={filterTabs}
      basePath="/team"
    />
  );
}
