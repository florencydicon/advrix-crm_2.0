import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { ChatPanel } from "@/components/ChatPanel";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!hasPermission(session.permissions ?? [], "chat:use")) {
    redirect("/dashboard");
  }

  return (
    <div className="h-[calc(100vh-5rem)]">
      <ChatPanel currentUserId={session.sub} title="Team Chat" />
    </div>
  );
}
