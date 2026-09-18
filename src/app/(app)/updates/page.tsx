import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import UpdatesView from "@/components/UpdatesView";

export const metadata = { title: "Updates — Advrix Media" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function UpdatesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const notifications = await getNotifications(session.sub, 200);
  return <UpdatesView notifications={notifications} />;
}