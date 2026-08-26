import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPipelineByClient, getTeam } from "@/lib/data";
import ProjectDetailView from "@/components/ProjectDetailView";

export const metadata = { title: "Client Pipeline — Advrix CRM" };

export default async function ClientPipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ project?: string; task?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["PROJECT_MANAGER", "SUPER_ADMIN"].includes(session.role_key)) redirect("/dashboard");

  const { id } = await params;
  const sp = await searchParams;
  const [pipeline, team] = await Promise.all([getPipelineByClient(), getTeam()]);
  const client = pipeline.find((c) => c.client_id === id);
  if (!client) notFound();

  return (
    <ProjectDetailView
      client={client}
      team={team}
      roleKey={session.role_key}
      userId={session.sub}
      highlightProject={sp.project || null}
      highlightTask={sp.task ? decodeURIComponent(sp.task) : null}
    />
  );
}
