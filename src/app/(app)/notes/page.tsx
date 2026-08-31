import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import NotesView from "@/components/NotesView";

export default async function NotesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <NotesView
      userId={session.sub}
      userName={session.name}
      roleKey={session.role_key}
      permissions={session.permissions ?? []}
    />
  );
}
