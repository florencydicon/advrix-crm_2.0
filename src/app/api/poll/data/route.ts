import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMyTasks, getTeam } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Lightweight JSON endpoint backing the 3s silent dashboard poll
 * (StaffDashboard / SmmDashboard). Returns the current user's task rows plus
 * the team list so the tables/cards refresh in place — never a page reload.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [tasks, team] = await Promise.all([getMyTasks(session.sub), getTeam()]);
  return NextResponse.json(
    { tasks, team },
    { headers: { "Cache-Control": "no-store" } }
  );
}