import { getSession } from "@/lib/session";
import { getNotifications } from "@/lib/notifications";
import UpdatesView from "@/components/UpdatesView";

export const metadata = { title: "Updates — Advrix Media" };

export default async function UpdatesPage() {
  const session = (await getSession())!;
  const notifications = await getNotifications(session.sub, 200);
  return <UpdatesView notifications={notifications} />;
}