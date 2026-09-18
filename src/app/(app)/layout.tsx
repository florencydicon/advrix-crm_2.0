import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.sub, 8).catch(() => []),
    getUnreadNotificationCount(session.sub).catch(() => 0),
  ]);

  return (
    <AppShell session={session} notifications={notifications} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}