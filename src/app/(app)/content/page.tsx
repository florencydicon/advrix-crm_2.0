import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";
import { getWriterBoard } from "@/lib/data";
import ContentBoard from "@/components/ContentBoard";

export const metadata = { title: "Content Hub — Advrix CRM" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MANAGER_ROLES = ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "PM"];

export default async function ContentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const perms = session.permissions || [];
  const allowed =
    hasAnyPermission(perms, ["tasks:execute", "tasks:manage", "admin:*"]) ||
    MANAGER_ROLES.includes((session.role_key || "").toUpperCase());
  if (!allowed) redirect("/dashboard");

  const manageAll =
    hasPermission(perms, "tasks:manage") ||
    MANAGER_ROLES.includes((session.role_key || "").toUpperCase());
  const board = await getWriterBoard(session.sub, manageAll).catch(() => []);

  return (
    <div className="h-full p-4 md:p-6">
      <ContentBoard initial={board} manageAll={manageAll} userName={session.name} />
    </div>
  );
}
