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
  let client = pipeline.find((c) => c.client_id === id);
  // Fallback: if URL was built with project_id as client_id (deep link from notification with stale client lookup), try to resolve via project
  if (!client) {
    const byProject = pipeline.find((c) => c.projects.some((p) => p.id === id));
    if (byProject) {
      // Redirect to correct client URL to avoid 404, preserving task deep link if present
      const { redirect } = await import("next/navigation");
      const taskPart = sp.task ? `&task=${encodeURIComponent(sp.task)}` : "";
      redirect(`/projects/${byProject.client_id}?project=${id}${taskPart}`);
    }
    // Last resort: try direct project lookup (handles cases where pipeline is empty due to transient DB error)
    try {
      const { query } = await import("@/lib/db");
      const rows = await query<{ client_id: string }>(`SELECT client_id FROM projects WHERE id = $1`, [id]);
      if (rows[0]?.client_id) {
        const { redirect } = await import("next/navigation");
        const taskPart = sp.task ? `&task=${encodeURIComponent(sp.task)}` : "";
        redirect(`/projects/${rows[0].client_id}?project=${id}${taskPart}`);
      }
    } catch {}
    if (!client) notFound();
  }

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
