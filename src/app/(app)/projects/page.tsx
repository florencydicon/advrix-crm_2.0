import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPipelineByClient } from "@/lib/data";
import ClientPipeline from "@/components/ClientPipeline";

export const metadata = { title: "Project Pipeline — Advrix CRM" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!["PROJECT_MANAGER", "SUPER_ADMIN"].includes(session.role_key)) redirect("/dashboard");

  const params = await searchParams;

  // Legacy deep links (?client=) now resolve to the dedicated client pipeline page.
  if (params.client) redirect(`/projects/${params.client}`);

  const pipeline = await getPipelineByClient();

  return <ClientPipeline pipeline={pipeline} />;
}
