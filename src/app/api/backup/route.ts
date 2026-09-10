import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  generateDatabaseDump,
  getStorageInfo,
  checkStorageAndAlert,
  createBackupSnapshot,
  listBackups,
  getBackupSql,
  deleteBackup,
  restoreFromSql,
  updateStorageLimit,
} from "@/lib/backup";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" } as const;
  if (session.role_key !== "SUPER_ADMIN") return { error: "Forbidden" } as const;
  return { session } as const;
}

/**
 * Full database backup.
 *
 * GET  /api/backup                        → download a fresh SQL dump
 * GET  /api/backup?id=<id>                → download a stored snapshot
 * GET  /api/backup?action=info            → storage info + snapshot list (JSON)
 * POST /api/backup {action:"snapshot"}    → create a manual backup snapshot
 * POST /api/backup {action:"restore",id}  → restore DB from a stored snapshot
 * POST /api/backup {action:"delete",id}   → delete a stored snapshot
 * POST /api/backup {action:"check"}       → run storage check + alert now
 * POST /api/backup {action:"set-limit",bytes} → update storage limit
 *
 * All endpoints require SUPER_ADMIN.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return new Response(auth.error, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const action = sp.get("action");

  if (action === "info") {
    const [info, backups] = await Promise.all([getStorageInfo(), listBackups()]);
    return Response.json({ ok: true, info, backups });
  }

  let sql: string;
  let filename: string;
  if (id) {
    const found = await getBackupSql(id);
    if (!found) return Response.json({ error: "Snapshot not found." }, { status: 404 });
    sql = found.sql;
    filename = found.row.filename;
  } else {
    try {
      sql = await generateDatabaseDump();
    } catch (err) {
      console.error("backup dump failed:", err);
      return Response.json({ error: "Failed to generate backup. Check server logs." }, { status: 500 });
    }
    filename = `advrix-full-backup-${new Date().toISOString().slice(0, 10)}.sql`;
  }

  return new Response(sql, {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  const session = auth.session;

  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  try {
    switch (action) {
      case "snapshot": {
        const row = await createBackupSnapshot("manual", session.sub);
        return Response.json({ ok: true, row });
      }

      case "restore": {
        const id = String(body.id || "");
        const found = await getBackupSql(id);
        if (!found) return Response.json({ error: "Snapshot not found." }, { status: 404 });
        const result = await restoreFromSql(found.sql);
        if (!result.ok) return Response.json({ ...result, error: result.error }, { status: 500 });
        return Response.json(result);
      }

      case "delete": {
        const id = String(body.id || "");
        await deleteBackup(id);
        return Response.json({ ok: true });
      }

      case "check": {
        const info = await checkStorageAndAlert();
        return Response.json({ ok: true, info });
      }

      case "set-limit": {
        const bytes = Number(body.bytes);
        if (!bytes || bytes < 1) return Response.json({ error: "Invalid limit." }, { status: 400 });
        await updateStorageLimit(bytes);
        const info = await getStorageInfo();
        return Response.json({ ok: true, info });
      }

      default:
        return Response.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (err: any) {
    console.error("backup action failed:", err);
    return Response.json({ error: err?.message || "Backup action failed." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  if (!id) return Response.json({ error: "Missing id." }, { status: 400 });
  try {
    await deleteBackup(id);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Delete failed." }, { status: 500 });
  }
}