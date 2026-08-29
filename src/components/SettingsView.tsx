"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Users, ShieldCheck, KeyRound, Trash2, AlertTriangle, Database, Loader2 } from "lucide-react";
import type { UserRow } from "@/lib/types";
import type { FilterTab } from "@/components/SmartTable";
import TeamView from "@/components/TeamView";
import DataExportPanel from "@/components/DataExportPanel";
import { Modal } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { flushDataAction, flushEntireDatabaseAction, type FlushEntity } from "@/lib/actions/admin";

export default function SettingsView({
  users,
  roles,
  page,
  pageSize,
  total,
  totalPages,
  search,
  roleFilter,
  filterTabs,
  basePath,
  sessionName,
  sessionRole,
  counts,
}: {
  users: UserRow[];
  roles: { key: string; label: string }[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  search: string;
  roleFilter: string;
  filterTabs: FilterTab[];
  basePath: string;
  sessionName: string;
  sessionRole: string;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "general">("users");
  const initials = sessionName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400">Manage your account, team members, and permissions.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setTab("users"); router.push("/settings"); }}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "users" ? "bg-brand-300 text-night-950" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
          }`}
        >
          <Users className="h-4 w-4" /> Users & Roles
        </button>
        <button
          onClick={() => setTab("general")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "general" ? "bg-brand-300 text-night-950" : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
          }`}
        >
          <UserCog className="h-4 w-4" /> General
        </button>
      </div>

      {tab === "users" ? (
        <TeamView
          users={users}
          roles={roles}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          search={search}
          roleFilter={roleFilter}
          filterTabs={filterTabs}
          basePath={basePath}
          title="User Management"
          subtitle="Create users, assign roles, and control access."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand-300 flex items-center justify-center text-night-950 font-bold">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-white">{sessionName}</p>
                  <p className="text-xs text-slate-400">{sessionRole}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-brand-300/[0.07] text-brand-300 px-4 py-3 text-sm">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                You are signed in with Super Admin privileges.
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] text-slate-300 px-4 py-3 text-sm">
                <KeyRound className="h-4 w-4 shrink-0" />
                Use the Users &amp; Roles tab to create team members and manage passwords.
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold mb-3">Agency</h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Organization name</label>
                  <input className="input" defaultValue="Advrix Media" disabled />
                </div>
                <div>
                  <label className="label">Workspace</label>
                  <input className="input" defaultValue="advrix-crm" disabled />
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  These fields are read-only. Contact your developer to change agency branding.
                </p>
              </div>
            </div>
          </div>

          <DataExportPanel />
        </div>
      )}

      <FlushDatabasePanel counts={counts} />
    </div>
  );
}

const FLUSH_OPTIONS: { key: FlushEntity; label: string; desc: string }[] = [
  { key: "clients", label: "Clients", desc: "All clients (cascades to their projects & tasks)" },
  { key: "projects", label: "Projects", desc: "All projects, deliverables & assignments" },
  { key: "tasks", label: "Tasks", desc: "All tasks, assignees & contributions" },
  { key: "leads", label: "Leads", desc: "All leads / enquiries" },
  { key: "attendance", label: "Attendance", desc: "All punch-in/out records" },
  { key: "leaves", label: "Leaves", desc: "All leave applications" },
  { key: "notifications", label: "Notifications", desc: "All user notifications" },
  { key: "users", label: "Users", desc: "Non-SUPER_ADMIN users (you are kept)" },
];

function FlushDatabasePanel({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<FlushEntity[]>([]);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"selected" | "all" | null>(null);
  const [input, setInput] = useState("");

  function toggle(key: FlushEntity) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function runSelected() {
    if (selected.length === 0) {
      toast("Select at least one data type.", "error");
      return;
    }
    setInput("");
    setConfirm("selected");
  }

  function runAll() {
    setInput("");
    setConfirm("all");
  }

  function confirmFlush() {
    if (input.trim() !== "FLUSH") {
      toast('Type FLUSH to confirm.', "error");
      return;
    }
    const mode = confirm;
    setConfirm(null);
    setInput("");
    start(async () => {
      const res =
        mode === "all"
          ? await flushEntireDatabaseAction()
          : await flushDataAction(selected);
      if (res.error) toast(res.error, "error");
      else {
        toast(mode === "all" ? "Entire database flushed." : `Flushed: ${selected.join(", ")}`, "success");
        setSelected([]);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="card p-6 border-rose-400/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-rose-400/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <h2 className="font-semibold text-white">Danger Zone — Flush Database</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          SUPER_ADMIN only. Permanently deletes data. This cannot be undone. Entire database flush keeps your account and SUPER_ADMIN users.
        </p>

        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          {FLUSH_OPTIONS.map((opt) => {
            const active = selected.includes(opt.key);
            const count = counts[opt.key] ?? 0;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggle(opt.key)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  active ? "border-rose-400/40 bg-rose-400/[0.06]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white flex items-center gap-1.5">
                    <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] ${active ? "bg-rose-400 border-rose-400 text-white" : "border-white/20"}`}>
                      {active ? "✓" : ""}
                    </span>
                    {opt.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${count > 0 ? "bg-white/10 text-slate-300" : "bg-emerald-400/10 text-emerald-300"}`}>
                    {count}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runSelected}
            disabled={pending || selected.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-white text-night-950 px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-white/90 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Flush Selected {selected.length > 0 ? `(${selected.length})` : ""}
          </button>
          <button
            onClick={runAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-rose-600 transition-colors"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            Flush Entire Database
          </button>
          {pending && <span className="text-xs text-slate-400">Flushing…</span>}
        </div>
        <p className="text-[11px] text-slate-500 mt-2">Tip: Deleting clients also deletes their projects and tasks via cascade.</p>
      </div>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={confirm === "all" ? "Flush ENTIRE database?" : "Flush selected data?"}>
        <div className="space-y-3">
          <div className="rounded-xl bg-rose-400/10 border border-rose-400/20 p-3 flex gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-300 leading-relaxed">
              {confirm === "all"
                ? "This will permanently delete all clients, projects, tasks, leads, attendance, leaves, notifications and non-SUPER_ADMIN users. Your SUPER_ADMIN account will be kept. This cannot be undone."
                : `This will permanently delete: ${selected.join(", ")}. This cannot be undone.`}
            </p>
          </div>
          <div>
            <label className="label">Type FLUSH to confirm</label>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="FLUSH" className="input" autoFocus />
          </div>
          <button onClick={confirmFlush} disabled={pending || input.trim() !== "FLUSH"} className="btn-primary w-full !bg-rose-500 hover:!bg-rose-600 disabled:opacity-40">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Confirm Flush
          </button>
        </div>
      </Modal>
    </>
  );
}