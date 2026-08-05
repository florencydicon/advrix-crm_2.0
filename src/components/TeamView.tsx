"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserX, UserCheck, Shield, Search } from "lucide-react";
import {
  createUserAction,
  toggleUserActiveAction,
  changeRoleAction,
  resetPasswordAction,
} from "@/lib/actions/users";
import type { UserRow } from "@/lib/types";
import { Modal } from "@/components/ui";

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-brand-100 text-brand-700",
  PROJECT_MANAGER: "bg-violet-100 text-violet-700",
  SALES: "bg-emerald-100 text-emerald-700",
  WRITER: "bg-amber-100 text-amber-700",
  DESIGNER: "bg-pink-100 text-pink-700",
  EDITOR: "bg-cyan-100 text-cyan-700",
  SMM: "bg-indigo-100 text-indigo-700",
};

export default function TeamView({ users, roles }: { users: UserRow[]; roles: { key: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = users.filter((u) => {
    if (roleFilter && u.role_key !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const roleCounts = roles.map((r) => ({
    ...r,
    count: users.filter((u) => u.role_key === r.key).length,
  }));

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, onDone?: () => void) {
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else onDone?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Team Management</h1>
          <p className="text-sm text-slate-500">Create members, assign roles, and control access.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>
          <Plus className="h-4 w-4" /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {roleCounts.map((r) => (
          <div key={r.key} className="card p-4">
            <span className={`badge ${ROLE_STYLES[r.key] || "bg-slate-100 text-slate-600"}`}>{r.label}</span>
            <p className="mt-2 text-2xl font-bold text-ink">{r.count}</p>
            <p className="text-xs text-slate-400">member{r.count === 1 ? "" : "s"}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="input !pl-9 !py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setRoleFilter("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              roleFilter === "" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({users.length})
          </button>
          {roleCounts.map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r.label} ({r.count})
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                    No members match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {initials(u.full_name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{u.full_name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <select
                        className="input !w-40 !py-1 text-xs"
                        value={u.role_key}
                        onChange={(e) => run(() => changeRoleAction(u.id, e.target.value))}
                      >
                        {roles.map((r) => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {u.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn-ghost !px-2 !py-1 text-xs"
                          title="Reset password"
                          onClick={() => { setResetTarget(u); setNewPassword(""); }}
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          className={`btn-ghost !px-2 !py-1 text-xs ${u.is_active ? "!text-rose-600" : "!text-emerald-600"}`}
                          onClick={() => run(() => toggleUserActiveAction(u.id, !u.is_active))}
                        >
                          {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add Team Member">
        {error && <p className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</p>}
        <form
          className="space-y-4"
          action={(fd) => run(() => createUserAction(fd), () => setModal(false))}
        >
          <div>
            <label className="label">Full name</label>
            <input name="full_name" required className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input name="password" type="password" required minLength={6} className="input" />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role_key" required className="input">
              {roles.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={pending}>Create member</button>
        </form>
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset password — ${resetTarget?.full_name || ""}`}>
        {error && <p className="mb-3 rounded-lg bg-rose-50 text-rose-700 text-sm px-3 py-2">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              className="input"
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button
            className="btn-primary w-full"
            disabled={pending || newPassword.length < 6}
            onClick={() =>
              run(() => resetPasswordAction(resetTarget!.id, newPassword), () => setResetTarget(null))
            }
          >
            Reset password
          </button>
        </div>
      </Modal>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
