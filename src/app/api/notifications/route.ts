import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import { etagJsonResponse } from "@/lib/http";

export async function GET(req: NextRequest) {
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
    return etagJsonResponse(req, { items, unread });
  } catch {
    return etagJsonResponse(req, { items: [], unread: 0 });
  }
}
