import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const key = getVapidPublicKey();
  return NextResponse.json({ publicKey: key }, { headers: { "Cache-Control": "no-store" } });
}
