import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";
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
  // ?limit lets the Updates page poll the same source as the bell (default 15 for the dropdown)
  let limit = 15;
  try {
    const raw = req.nextUrl.searchParams.get("limit");
    if (raw) limit = Math.max(1, Math.min(200, Number(raw) || 15));
  } catch {}
  try {
    const [items, unread] = await Promise.all([
      getNotifications(session.sub, limit),
      getUnreadNotificationCount(session.sub),
    ]);
    // Usage instrumentation (best-effort, never throws).
    await recordUsage({
      endpoint: `/api/notifications (limit ${limit})`,
      rows: items.length,
      bytes: JSON.stringify(items).length,
      durationMs: Date.now() - started,
    });
    return etagJsonResponse(req, { items, unread });
  } catch {
    return etagJsonResponse(req, { items: [], unread: 0 });
  }
}
