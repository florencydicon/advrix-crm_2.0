import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getNotificationsPage, getUnreadNotificationCount } from "@/lib/notifications";
import { etagJsonResponse } from "@/lib/http";
import { recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const started = Date.now();
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  // Server-side paging + filtering. Default 15/offset 0 keeps the bell dropdown
  // light; the Updates page asks for its own window via ?limit&offset&type&unread.
  const p = req.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(100, Number(p.get("limit")) || 15));
  const offset = Math.max(0, Number(p.get("offset")) || 0);
  const type = p.get("type") || undefined;
  const unreadParam = p.get("unread");
  const readFilter: boolean | null =
    unreadParam === "true" ? true : unreadParam === "false" ? false : null;

  try {
    const [page, unreadCount] = await Promise.all([
      getNotificationsPage(session.sub, { limit, offset, type, unread: readFilter }),
      getUnreadNotificationCount(session.sub),
    ]);
    // Usage instrumentation (best-effort, never throws).
    await recordUsage({
      endpoint: `/api/notifications (limit ${limit})`,
      rows: page.items.length,
      bytes: JSON.stringify(page.items).length,
      durationMs: Date.now() - started,
    });
    return etagJsonResponse(req, {
      items: page.items,
      unread: unreadCount,
      total: page.total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    });
  } catch {
    return etagJsonResponse(req, { items: [], unread: 0, total: 0, page: 1, pageSize: limit });
  }
}
