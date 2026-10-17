import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { canAccessContentHub, hasPermission } from "@/lib/permissions";
import { getWriterBoard } from "@/lib/data";
import ContentBoard from "@/components/ContentBoard";

export const metadata = { title: "Content Hub — Advrix CRM" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const WRITER_ROLES = ["WRITER", "CONTENT_WRITER"];

export default async function ContentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessContentHub(session)) redirect("/dashboard");

  // Writers see only their own subtasks; managers (and anyone granted
  // tasks:manage) see the whole team's board.
  const role = (session.role_key || "").toUpperCase();
  const manageAll =
    hasPermission(session.permissions, "tasks:manage") || !WRITER_ROLES.includes(role);
  const board = await getWriterBoard(session.sub, manageAll).catch(() => []);

  return (
    <div className="h-full p-4 md:p-6">
      <ContentBoard initial={board} manageAll={manageAll} userName={session.name} />
    </div>
  );
}
