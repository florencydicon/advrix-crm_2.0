import { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  applyWorkbook,
  buildBackupWorkbook,
  inspectWorkbook,
  publicPlan,
} from "@/lib/excelBackup";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) return { error: "Unauthorized", status: 401 } as const;
  if (session.role_key !== "SUPER_ADMIN") {
    return { error: "Forbidden — Super Admin only", status: 403 } as const;
  }
  return { session } as const;
}

/** GET /api/excel-backup → download the complete workbook. */
export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const buf = await buildBackupWorkbook();
    const filename = `advrix_full_backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e: any) {
    console.error("Excel backup failed:", e);
    return Response.json(
      { error: e?.message || "Could not generate the backup." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/excel-backup?mode=preview|apply[&delete=1]
 * Body: raw .xlsx bytes.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const mode = req.nextUrl.searchParams.get("mode") === "apply" ? "apply" : "preview";
  const allowDelete = req.nextUrl.searchParams.get("delete") === "1";

  try {
    const buf = Buffer.from(await req.arrayBuffer());
    if (!buf.length) {
      return Response.json({ error: "The uploaded file is empty." }, { status: 400 });
    }
    if (buf.length > MAX_UPLOAD_BYTES) {
      return Response.json(
        { error: "File is too large (maximum 25 MB)." },
        { status: 413 }
      );
    }

    if (mode === "preview") {
      const plan = await inspectWorkbook(buf, allowDelete);
      return Response.json({ ok: true, ...publicPlan(plan) });
    }

    const result = await applyWorkbook(buf, allowDelete);
    return Response.json({
      ok: true,
      applied: result.applied,
      statements: result.statements,
      message: `Done — ${result.applied.updates} updated, ${result.applied.inserts} added${
        result.applied.deletes ? `, ${result.applied.deletes} deleted` : ""
      }.`,
    });
  } catch (e: any) {
    console.error("Excel sync failed:", e);
    return Response.json(
      { error: e?.message || "Could not process the Excel file." },
      { status: 400 }
    );
  }
}
