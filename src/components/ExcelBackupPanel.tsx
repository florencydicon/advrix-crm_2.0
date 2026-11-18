"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/ui";

type Change = { column: string; from: string; to: string };
type DiffTable = {
  table: string;
  label: string;
  rowsInExcel: number;
  rowsInDb: number;
  updates: number;
  inserts: number;
  deletes: number;
  samples: { id: string; changes: Change[] }[];
};
type Preview = {
  tables: DiffTable[];
  totals: { updates: number; inserts: number; deletes: number };
  warnings: string[];
};

export default function ExcelBackupPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [allowDelete, setAllowDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function runPreview(withDelete: boolean) {
    if (!file) {
      toast("Choose the edited Excel file first.", "error");
      return;
    }
    setBusy("preview");
    setPreview(null);
    try {
      const res = await fetch(
        `/api/excel-backup?mode=preview${withDelete ? "&delete=1" : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: await file.arrayBuffer(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed.");
      setPreview(data as Preview);
    } catch (e: any) {
      toast(e?.message || "Could not read the Excel file.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function applyChanges() {
    if (confirmText.trim() !== "APPLY") {
      toast('Type APPLY to confirm.', "error");
      return;
    }
    if (!file) return;
    setBusy("apply");
    try {
      const res = await fetch(
        `/api/excel-backup?mode=apply${allowDelete ? "&delete=1" : ""}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: await file.arrayBuffer(),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed.");
      toast(data.message || "Excel changes applied to the live database.", "success");
      setConfirmOpen(false);
      setConfirmText("");
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e: any) {
      toast(e?.message || "Could not apply the changes.", "error");
    } finally {
      setBusy(null);
    }
  }

  const hasChanges =
    preview &&
    (preview.totals.updates > 0 ||
      preview.totals.inserts > 0 ||
      preview.totals.deletes > 0);

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <FileSpreadsheet className="h-4 w-4 text-brand-300" />
        <h2 className="font-semibold">Excel Backup &amp; Sync</h2>
        <span className="badge bg-brand-300/10 text-brand-300 ml-auto">Super Admin</span>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Download the entire CRM as one Excel workbook (one sheet per table). Edit any cell,
        upload the file back, review the exact changes, and they are written to the live
        database — only the cells you changed are updated.
      </p>

      {/* Step 1 — download */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-300 text-night-950 text-[10px] font-bold">
            1
          </span>
          <p className="text-xs font-semibold text-white">Download full backup</p>
        </div>
        <p className="text-[11px] text-slate-500 pl-7">
          Includes clients, projects, tasks, subtasks, leads, users, attendance, leave,
          content and every other business table. Passwords and auth tokens are excluded.
        </p>
        <div className="pl-7">
          <button
            type="button"
            onClick={() => window.open("/api/excel-backup", "_blank")}
            className="btn-secondary !py-1.5 !px-3 text-xs justify-center"
          >
            <Download className="h-3.5 w-3.5" /> Download Excel
          </button>
        </div>
      </div>

      {/* Step 2 — upload */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-300 text-night-950 text-[10px] font-bold">
            2
          </span>
          <p className="text-xs font-semibold text-white">Upload edited file &amp; preview</p>
        </div>
        <div className="pl-7 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-slate-200 cursor-pointer hover:bg-white/10 transition-colors">
            <Upload className="h-3.5 w-3.5 text-brand-300" />
            <span className={file ? "text-emerald-300" : ""}>
              {file ? file.name : "Choose .xlsx file"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setPreview(null);
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => runPreview(allowDelete)}
            disabled={!file || !!busy}
            className="btn-secondary !py-1.5 !px-3 text-xs justify-center disabled:opacity-40"
          >
            {busy === "preview" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            Preview changes
          </button>
        </div>
        <p className="text-[11px] text-slate-500 pl-7">
          Keep sheet names, column headers and ID values exactly as downloaded. Blank cell
          means NULL; use <span className="text-slate-300">&#39;&#39;</span> for an empty text value.
        </p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-brand-300/20 bg-brand-300/[0.06] p-3 text-center">
              <p className="text-lg font-bold text-brand-300">{preview.totals.updates}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">To update</p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-center">
              <p className="text-lg font-bold text-emerald-300">{preview.totals.inserts}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">To add</p>
            </div>
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-center">
              <p className="text-lg font-bold text-rose-300">{preview.totals.deletes}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-400">To delete</p>
            </div>
          </div>

          {preview.totals.deletes > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3">
              <AlertTriangle className="h-4 w-4 text-rose-300 shrink-0 mt-0.5" />
              <p className="text-[11px] text-rose-200 leading-relaxed">
                {preview.totals.deletes} row(s) exist in the database but not in this file.
                They will be <strong>deleted</strong> when you apply. Double-check before continuing.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-night-700/90 text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Table</th>
                    <th className="px-3 py-2 font-semibold text-right">Excel</th>
                    <th className="px-3 py-2 font-semibold text-right">DB</th>
                    <th className="px-3 py-2 font-semibold text-right">Update</th>
                    <th className="px-3 py-2 font-semibold text-right">Add</th>
                    <th className="px-3 py-2 font-semibold text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {preview.tables.map((t) => (
                    <tr key={t.table} className="text-slate-300">
                      <td className="px-3 py-1.5 font-medium text-white">{t.label}</td>
                      <td className="px-3 py-1.5 text-right">{t.rowsInExcel}</td>
                      <td className="px-3 py-1.5 text-right">{t.rowsInDb}</td>
                      <td className="px-3 py-1.5 text-right text-brand-300">
                        {t.updates || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-emerald-300">
                        {t.inserts || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-right text-rose-300">
                        {t.deletes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.tables.some((t) => t.samples.length > 0) && (
            <details className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <summary className="cursor-pointer text-[11px] font-semibold text-slate-300">
                Sample cell changes
              </summary>
              <div className="mt-3 space-y-3">
                {preview.tables
                  .filter((t) => t.samples.length > 0)
                  .map((t) => (
                    <div key={t.table} className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">
                        {t.label}
                      </p>
                      {t.samples.map((s, i) => (
                        <div key={i} className="rounded-lg bg-white/[0.03] px-3 py-2">
                          <p className="text-[10px] text-slate-500 truncate">{s.id}</p>
                          {s.changes.map((c) => (
                            <p key={c.column} className="text-[11px] text-slate-300">
                              <span className="text-brand-300">{c.column}</span>:{" "}
                              <span className="text-rose-300 line-through">{c.from}</span>{" "}
                              → <span className="text-emerald-300">{c.to}</span>
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </details>
          )}

          {preview.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3 space-y-1">
              {preview.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-200/90">
                  • {w}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — options + apply */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-300 text-night-950 text-[10px] font-bold">
            3
          </span>
          <p className="text-xs font-semibold text-white">Apply to live database</p>
        </div>
        <label className="pl-7 flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowDelete}
            onChange={(e) => {
              setAllowDelete(e.target.checked);
              if (file) void runPreview(e.target.checked);
            }}
            className="mt-0.5 accent-rose-400 shrink-0"
          />
          <span className="text-[11px] text-slate-400 leading-relaxed">
            Also delete rows that are in the database but missing from this Excel file.
            Off by default — leave it off if you only edited existing cells.
          </span>
        </label>
        <div className="pl-7 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirmText("");
              setConfirmOpen(true);
            }}
            disabled={!hasChanges || !!busy}
            className="btn-primary !py-1.5 !px-3 text-xs justify-center disabled:opacity-40"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Apply changes
          </button>
          {!hasChanges && preview && (
            <span className="text-[11px] text-slate-500">
              No differences found — the database is already up to date.
            </span>
          )}
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Apply Excel changes to the live database?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-amber-400/10 border border-amber-400/20 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              This writes your edits directly to the production database:{" "}
              <strong>{preview?.totals.updates || 0}</strong> row(s) updated,{" "}
              <strong>{preview?.totals.inserts || 0}</strong> added
              {preview?.totals.deletes ? (
                <>
                  , <strong>{preview.totals.deletes}</strong> deleted
                </>
              ) : null}
              . Everything not present in the Excel file is left untouched. This cannot be
              undone — take a SQL backup first if unsure.
            </p>
          </div>
          <div>
            <label className="label">Type APPLY to confirm</label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="APPLY"
              className="input"
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={applyChanges}
            disabled={confirmText.trim() !== "APPLY" || busy === "apply"}
            className="btn-primary w-full !bg-amber-500 hover:!bg-amber-600 disabled:opacity-40"
          >
            {busy === "apply" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Apply to live database"
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
