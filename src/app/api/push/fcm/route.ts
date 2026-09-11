import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveFcmToken, removeFcmToken } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const token: string | undefined = body?.token;
    const platform: string | undefined = body?.platform;
    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    await saveFcmToken(session.sub, token, platform || "android");
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
    const token: string | undefined = body?.token;
    if (token) await removeFcmToken(token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}