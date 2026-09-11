import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return NextResponse.json(
      { items, unread },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ items: [], unread: 0 }, { headers: { "Cache-Control": "no-store" } });
  }
}
