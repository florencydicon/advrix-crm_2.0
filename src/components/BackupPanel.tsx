"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Database,
  HardDrive,
  AlertTriangle,
  Loader2,
  Trash2,
  RotateCcw,
  Plus,
  Upload,
  CheckCircle2,
  Gauge,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { Modal } from "@/components/ui";

interface BackupRow {
  id: string;
  kind: "manual" | "monthly";
  filename: string;
  size_bytes: number;
  created_by: string | null;
  created_at: string;
}

interface StorageInfo {
  used_bytes: number;
  limit_bytes: number;
  alert_pct: number;
  used_pct: number;
  last_alert_at: string | null;
  checked_at: string | null;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function BackupPanel() {
  const router = useRouter();
  const { toast } = useToast();
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);
  const [restoreInput, setRestoreInput] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setBusy("load");
    try {
      const res = await fetch("/api/backup?action=info", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load backup panel.");
      const data = await res.json();
      setInfo(data.info);
      setBackups(data.backups || []);
    } catch {
      toast("Could not load backup info.", "error");
    } finally {
      setBusy(null);
    }
  }, [toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadBackup(id?: string) {
    const url = id ? `/api/backup?id=${encodeURIComponent(id)}` : "/api/backup";
    window.open(url, "_blank");
  }

  async function createManual() {
    setBusy("snapshot");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "snapshot" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Snapshot failed.");
      toast("Full database backup saved.", "success");
      await load();
    } catch (e: any) {
      toast(e?.message || "Snapshot failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function runCheck() {
    setBusy("check");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check failed.");
      setInfo(data.info);
      if (data.info?.used_pct >= data.info?.alert_pct) {
        toast("Database storage nearly full — a cleanup warning was sent to Super Admins.", "info");
      }
      toast("Storage check complete.", "success");
    } catch (e: any) {
      toast(e?.message || "Check failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function confirmRestore() {
    if (restoreInput.trim() !== "RESTORE") {
      toast('Type RESTORE to confirm.', "error");
      return;
    }
    if (!restoreTarget) return;
    setBusy("restore");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", id: restoreTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed.");
      toast(`Database restored from ${restoreTarget.filename}.`, "success");
      setRestoreTarget(null);
      setRestoreInput("");
      router.refresh();
    } catch (e: any) {
      toast(e?.message || "Restore failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function deleteBackup(id: string) {
    setBusy("delete");
    try {
      const res = await fetch(`/api/backup?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed.");
      toast("Backup deleted.", "success");
      await load();
    } catch (e: any) {
      toast(e?.message || "Delete failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function uploadRestore() {
    if (!file) return toast("Choose a .sql backup file first.", "error");
    setBusy("upload");
    try {
      const text = await file.text();
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed.");
      toast(`Imported ${file.name} (${data.executed} statements).`, "success");
      setFile(null);
      router.refresh();
    } catch (e: any) {
      toast(e?.message || "Restore failed.", "error");
    } finally {
      setBusy(null);
    }
  }

  const limitMb = info ? Math.round(info.limit_bytes / (1024 * 1024)) : 512;
  const over = info ? info.used_pct >= info.alert_pct : false;
  const full = info ? info.used_bytes >= info.limit_bytes : false;

  return (
    <>
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-2 flex-wrap">
          <HardDrive className="h-4 w-4 text-brand-300" />
          <h2 className="font-semibold">Database Backup</h2>
          <span className="badge bg-brand-300/10 text-brand-300 ml-auto">Super Admin</span>
        </div>

        <p className="text-xs text-slate-500">
          Download the entire database as a SQL file (all schema + all data), save a backup
          snapshot, and restore from any snapshot. A monthly auto-backup snapshot is stored
          automatically.
        </p>

        {/* Storage meter */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              Storage usage
            </span>
            <span className="text-xs text-slate-400">
              {info ? `${fmtBytes(info.used_bytes)} / ${fmtBytes(info.limit_bytes)}` : "…"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                full ? "bg-rose-500" : over ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(100, info?.used_pct ?? 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className={full ? "text-rose-300" : over ? "text-amber-300" : "text-slate-500"}>
              {info ? `${info.used_pct.toFixed(1)}% of ${limitMb} MB limit` : "…"}
              {full && " — database is full!"}
              {over && !full && " — database almost full"}
            </span>
            <div className="flex items-center gap-1.5">
              {info?.checked_at && (
                <span className="text-slate-600 flex items-center gap-1 truncate max-w-[150px]">
                  <RefreshCw className="h-3 w-3 shrink-0" />
                  {new Date(info.checked_at).toLocaleDateString()}
                </span>
              )}
              <button
                onClick={runCheck}
                disabled={!!busy}
                className="inline-flex items-center gap-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-200 disabled:opacity-40 transition-colors"
              >
                {busy === "check" ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertTriangle className="h-3 w-3" />}
                Check now
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed">
            When usage crosses {info?.alert_pct ?? 90}% of the limit, Super Admins get a
            notification: “database almost full need cleanup. kindly backup your data and clean it.”
          </p>
        </div>

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-2">
          <button
            onClick={() => downloadBackup()}
            disabled={busy === "dump"}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-night-950 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-white/90 transition-colors"
          >
            {busy === "dump" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download full SQL backup
          </button>
          <button
            onClick={createManual}
            disabled={!!busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-300 text-night-950 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-brand-200 transition-colors"
          >
            {busy === "snapshot" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Save backup now
          </button>
        </div>

        {/* Import from file */}
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer shrink-0">
            <Upload className="h-3.5 w-3.5 text-brand-300" />
            <span className={file ? "text-emerald-300 font-medium" : ""}>{file ? file.name : "Restore from .sql file"}</span>
            <input
              type="file"
              accept=".sql"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            onClick={uploadRestore}
            disabled={!file || !!busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-400/20 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-rose-500/20 transition-colors"
          >
            {busy === "upload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Restore from file
          </button>
          <span className="text-[10px] text-slate-600">
            Runs the SQL statements in the file. Destructive — it will replace existing data.
          </span>
        </div>

        {/* Existing snapshots */}
        <div>
          <h3 className="text-xs font-semibold text-slate-300 mb-2">Saved backups</h3>
          {backups.length === 0 ? (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Database className="h-3.5 w-3.5" /> No saved backups yet. Use “Save backup now” or wait for the monthly auto-backup.
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <div key={b.id} className="rounded-xl bg-white/[0.03] border border-white/10 p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-300/10 flex items-center justify-center shrink-0">
                    {b.kind === "monthly" ? (
                      <RefreshCw className="h-4 w-4 text-brand-300" />
                    ) : (
                      <Database className="h-4 w-4 text-brand-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{b.filename}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span className={`badge ${b.kind === "monthly" ? "bg-brand-300/10 text-brand-300" : "bg-white/10 text-slate-300"}`}>
                        {b.kind}
                      </span>
                      {fmtBytes(b.size_bytes)}
                      <span>·</span>
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => downloadBackup(b.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setRestoreTarget(b); setRestoreInput(""); }}
                      disabled={busy === "restore"}
                      className="p-2 rounded-lg text-amber-300 hover:bg-amber-300/10 transition-colors"
                      title="Restore from this backup"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteBackup(b.id)}
                      disabled={busy === "delete"}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-400/10 transition-colors"
                      title="Delete backup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Backups are stored inside your Neon database. For disaster recovery keep a downloaded
          copy of the SQL file somewhere safe.
        </p>
      </div>

      <Modal open={!!restoreTarget} onClose={() => setRestoreTarget(null)} title="Restore database from backup?">
        <div className="space-y-3">
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              This replaces your current database with the backup “
              {restoreTarget?.filename}” ({restoreTarget ? fmtBytes(restoreTarget.size_bytes) : ""}).
              All current data that is not in this backup will be lost. This cannot be undone.
            </p>
          </div>
          <div>
            <label className="label">Type RESTORE to confirm</label>
            <input
              value={restoreInput}
              onChange={(e) => setRestoreInput(e.target.value)}
              placeholder="RESTORE"
              className="input"
              autoFocus
            />
          </div>
          <button
            onClick={confirmRestore}
            disabled={restoreInput.trim() !== "RESTORE" || busy === "restore"}
            className="btn-primary w-full !bg-amber-500 hover:!bg-amber-600 disabled:opacity-40"
          >
            {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Restore Database
          </button>
        </div>
      </Modal>
    </>
  );
}