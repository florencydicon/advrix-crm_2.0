import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { restoreFromSql } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Restore the database from raw SQL (e.g. an uploaded .sql backup file or a
 * previously downloaded dump). SUPER_ADMIN only. Destructive — the caller must
 * confirm before sending.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role_key !== "SUPER_ADMIN")
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sql = String(body.sql || "").trim();
  if (!sql) return Response.json({ error: "Empty SQL." }, { status: 400 });
  // Basic safety: refuse dumps that look truncated or empty of table statements.
  if (sql.length < 50 || !/CREATE TABLE|INSERT INTO/i.test(sql)) {
    return Response.json({ error: "Does not look like a valid backup file." }, { status: 400 });
  }

  try {
    const result = await restoreFromSql(sql);
    if (!result.ok) {
      return Response.json({
        ...result,
        error: `Restore stopped at statement ${result.executed + 1}: ${result.error}`,
      }, { status: 500 });
    }
    return Response.json(result);
  } catch (err: any) {
    console.error("restore API failed:", err);
    return Response.json({ error: err?.message || "Restore failed." }, { status: 500 });
  }
}