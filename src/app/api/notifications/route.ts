import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [items, unread] = await Promise.all([
      getNotifications(session.sub, 15),
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
