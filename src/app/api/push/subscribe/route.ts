import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { savePushSubscription, removePushSubscription } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    // Accept both {endpoint, keys:{p256dh,auth}} and {endpoint, p256dh, auth}
    const endpoint: string | undefined = body?.endpoint;
    const p256dh: string | undefined = body?.keys?.p256dh || body?.p256dh;
    const auth: string | undefined = body?.keys?.auth || body?.auth;
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }
    await savePushSubscription(session.sub, { endpoint, p256dh, auth });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const endpoint: string | undefined = body?.endpoint;
    if (!endpoint) return NextResponse.json({ ok: true });
    await removePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
