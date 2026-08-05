import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTeamPaginated, getRoles } from "@/lib/data";
import SettingsView from "@/components/SettingsView";

export const metadata = { title: "Settings — Advrix Media" };

export default async function SettingsPage({
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
    <SettingsView
      users={result.items}
      roles={roles}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
      totalPages={result.totalPages}
      search={search}
      roleFilter={role}
      filterTabs={filterTabs}
      basePath="/settings"
      sessionName={session.name}
      sessionRole={session.role_label}
    />
  );
}