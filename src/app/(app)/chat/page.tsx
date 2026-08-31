import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import ChatPanel from "@/components/ChatPanel";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!hasPermission(session.permissions ?? [], "chat:use")) {
    redirect("/dashboard");
  }

  return (
    <ChatPanel
      currentUserId={session.sub}
      roleKey={session.role_key}
      permissions={session.permissions ?? []}
    />
  );
}
