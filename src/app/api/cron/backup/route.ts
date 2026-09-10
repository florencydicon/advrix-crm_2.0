import { NextRequest } from "next/server";
import { checkStorageAndAlert, createBackupSnapshot } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Monthly auto-backup + storage monitor.
 *
 * Requires the Authorization header to match CRON_SECRET. Vercel Cron CRON_SECRET
 * is configured in the project environment. Route should be scheduled via
 * vercel.json "crons" at a monthly cadence (e.g. "0 0 1 * *").
 *
 * What it does:
 *  1. Runs the storage check and (re)fires the "database almost full" alert.
 *  2. Creates a monthly full-SQL backup snapshot and stores it in db_backups.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isCron = auth === `Bearer ${secret}` || req.headers.get("x-vercel-cron") === "1";
  if (!secret || !isCron) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Storage check + alert (only fires when crossing the threshold).
    const info = await checkStorageAndAlert();

    // 2. Monthly backup snapshot.
    const row = await createBackupSnapshot("monthly");

    return Response.json({ ok: true, info, backup: { id: row.id, filename: row.filename } });
  } catch (err: any) {
    console.error("cron backup failed:", err);
    return Response.json({ error: err?.message || "Cron backup failed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Keep both verbs working so the schedule can hit either.
  return GET(req);
}