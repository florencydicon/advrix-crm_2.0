import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getNotificationsPage, getNotificationTypeCounts } from "@/lib/notifications";
import UpdatesView from "@/components/UpdatesView";

export const metadata = { title: "Updates — Advrix Media" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Server-side pagination + filtering: only the visible window is fetched.
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const pageSize = Math.max(1, Math.min(100, Number(one("size")) || 25));
  const requestedPage = Math.max(1, Number(one("page")) || 1);
  const type = one("type");
  const filter = one("filter") || "all";

  const { items, total } = await getNotificationsPage(session.sub, {
    limit: pageSize,
    offset: (requestedPage - 1) * pageSize,
    type,
    unread: filter === "unread" ? true : null,
  });
  const typeCounts = await getNotificationTypeCounts(session.sub).catch(() => ({}));

  return (
    <UpdatesView
      initialItems={items}
      initialTotal={total}
      initialPage={requestedPage}
      initialPageSize={pageSize}
      typeCounts={typeCounts}
    />
  );
}