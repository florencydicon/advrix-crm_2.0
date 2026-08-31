import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { getPipelineByClient } from "@/lib/data";
import type { PipelineClient } from "@/lib/data";
import ClientPipeline from "@/components/ClientPipeline";

export const metadata = { title: "Project Pipeline — Advrix CRM" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.permissions, "projects:view")) redirect("/dashboard");

  const params = await searchParams;

  if (params.client) redirect(`/projects/${params.client}`);

  let pipeline: PipelineClient[] = [];
  try {
    pipeline = await getPipelineByClient();
  } catch (err) {
    console.error("Failed to load project pipeline:", err);
  }

  return <ClientPipeline pipeline={pipeline} />;
}
