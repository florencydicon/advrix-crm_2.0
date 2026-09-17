import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";
import { etagJsonResponse } from "@/lib/http";
import { cached } from "@/lib/cache";

// Short per-user TTL: the bell polls every 10s; serving the (read-state-safe)
// payload from the in-process cache instead of the DB for up to 5s keeps
// polling cheap while any mark-read change lands within a single poll tick.
const NOTIF_CACHE_TTL_MS = 5_000;

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
  // Key includes the limit so different consumers never share a wrong-sized cache line.
  const key = `notif:${session.sub}:${limit}`;
  try {
    const payload = await cached(
      key,
      NOTIF_CACHE_TTL_MS,
      async () => {
        const [items, unread] = await Promise.all([
          getNotifications(session.sub, limit),
          getUnreadNotificationCount(session.sub),
        ]);
        return { items, unread };
      }
    );
    return etagJsonResponse(req, payload);
  } catch {
    return etagJsonResponse(req, { items: [], unread: 0 });
  }
}