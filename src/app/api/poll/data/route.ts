import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMyTasks, getTeam } from "@/lib/data";
import { etagJsonResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * Lightweight JSON endpoint backing the silent dashboard poll
 * (StaffDashboard / SmmDashboard). Returns the current user's task rows plus
 * the team list so the tables/cards refresh in place — never a page reload.
 * ETagged so unchanged payloads return 304 and transfer nothing.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const [tasks, team] = await Promise.all([getMyTasks(session.sub), getTeam()]);
  return etagJsonResponse(req, { tasks, team });
}