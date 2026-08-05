import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTeam, getRoles } from "@/lib/data";
import TeamView from "@/components/TeamView";

export const metadata = { title: "Team — Advrix CRM" };

export default async function TeamPage() {
  const session = (await getSession())!;
  if (session.role_key !== "SUPER_ADMIN") redirect("/dashboard");

  const [users, roles] = await Promise.all([getTeam(), getRoles()]);

  return <TeamView users={users} roles={roles} />;
}