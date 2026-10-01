import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMyTasksPage, getTeam } from "@/lib/data";
import { etagJsonResponse } from "@/lib/http";
import { recordUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

/**
 * Lightweight JSON endpoint backing the silent dashboard poll
 * (StaffDashboard / SmmDashboard). Returns the current user's task rows plus
 * the team list so the tables/cards refresh in place — never a page reload.
 * ETagged so unchanged payloads return 304 and transfer nothing.
 *
 * Honours ?tab=&page=&size= so the refresh returns the SAME window the user is
 * looking at; without this a background poll would replace a 25-row page with
 * the full (unpaginated) list.
 */
export async function GET(req: NextRequest) {
  const started = Date.now();
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const sp = req.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(100, Number(sp.get("size")) || 25));
  const page = Math.max(1, Number(sp.get("page")) || 1);

  const [tasks, team] = await Promise.all([
    getMyTasksPage(session.sub, {
      tab: sp.get("tab") === "history" ? "history" : "active",
      limit,
      offset: (page - 1) * limit,
    }).then((r) => r.items),
    getTeam(),
  ]);
  // Usage instrumentation (best-effort, never throws).
  await recordUsage({
    endpoint: "/api/poll/data",
    rows: tasks.length + team.length,
    bytes: JSON.stringify({ tasks, team }).length,
    durationMs: Date.now() - started,
  });
  return etagJsonResponse(req, { tasks, team });
}