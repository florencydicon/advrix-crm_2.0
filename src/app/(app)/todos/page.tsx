import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import TodoView from "@/components/TodoView";

export default async function TodosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!hasPermission(session.permissions ?? [], "todos:manage")) {
    redirect("/dashboard");
  }

  return <TodoView permissions={session.permissions ?? []} />;
}
