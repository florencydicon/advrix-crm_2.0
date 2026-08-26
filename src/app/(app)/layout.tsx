import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.sub, 8),
    getUnreadNotificationCount(session.sub),
  ]);

  return (
    <AppShell session={session} notifications={notifications} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}