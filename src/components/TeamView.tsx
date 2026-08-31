"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserX, UserCheck, Shield, Eye, EyeOff, Smartphone, ShieldCheck } from "lucide-react";
import {
  createUserAction,
  toggleUserActiveAction,
  changeRoleAction,
  updateUserPhoneAction,
  resetPasswordAction,
} from "@/lib/actions/users";
import { updateUserPermissionsAction, updateUserDesignationAction } from "@/lib/actions/roles";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import type { UserRow } from "@/lib/types";
import { Modal } from "@/components/ui";
import SmartTable, { type Column, type FilterTab } from "@/components/SmartTable";
import { PermissionPicker } from "@/components/RolesManager";

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-brand-300/10 text-brand-300",
  PROJECT_MANAGER: "bg-violet-400/10 text-violet-300",
  SALES: "bg-emerald-400/10 text-emerald-300",
  WRITER: "bg-amber-400/10 text-amber-300",
  DESIGNER: "bg-pink-400/10 text-pink-300",
  EDITOR: "bg-cyan-400/10 text-cyan-300",
  SMM: "bg-indigo-400/10 text-indigo-300",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        // Stop browsers autofilling the admin's saved password into these fields.
        autoComplete="new-password"
        className={`input pr-10 ${props.className || ""}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-white transition-colors"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

export default function TeamView({
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
  title = "Team",
  subtitle = "Manage members, roles, and access.",
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
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modal, setModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [permTarget, setPermTarget] = useState<UserRow | null>(null);
  const [designation, setDesignation] = useState("");
  const [perms, setPermsState] = useState<string[]>([]);

  function openPerms(u: UserRow) {
    setPermTarget(u);
    setDesignation(u.designation || "");
    setPermsState(u.permissions ?? DEFAULT_ROLE_PERMISSIONS[u.role_key] ?? []);
    setError(null);
  }

  function closeReset() {
    setResetTarget(null);
  }

  function closePerms() {
    setPermTarget(null);
  }

  async function savePerms() {
    const user = permTarget;
    if (!user) return;
    const overrideChanged = (user.permissions ?? []).join(",") !== perms.join(",");
    if (overrideChanged) {
      const res = await updateUserPermissionsAction(user.id, perms.length ? perms : null);
      if (res.error) { setError(res.error); return; }
    }
    if ((user.designation || "") !== designation.trim()) {
      const res = await updateUserDesignationAction(user.id, designation.trim());
      if (res.error) { setError(res.error); return; }
    }
    setPermTarget(null);
    router.refresh();
  }

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, onDone?: () => void) {
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else onDone?.();
      router.refresh();
    });
  }

  const columns: Column<UserRow>[] = [
    {
      key: "member",
      label: "Member",
      render: (u) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
            {initials(u.full_name)}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-xs text-white truncate">{u.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{u.designation || u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      className: "w-[160px]",
      render: (u) => (
        <select
          className="input !w-36 !py-0.5 text-[11px]"
          value={u.role_key}
          onChange={(e) => run(() => changeRoleAction(u.id, e.target.value))}
        >
          {roles.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
      ),
    },
    {
      key: "status",
      label: "Status",
      className: "w-[90px]",
      render: (u) => (
        <span className={`badge ${u.is_active ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
          {u.is_active ? "Active" : "Suspended"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-[80px]",
      render: (u) => (
        <div className="flex items-center justify-end gap-0.5">
          <button
            className="btn-ghost !px-1.5 !py-0.5 text-[11px]"
            title="Edit WhatsApp number"
            onClick={() => {
              const phone = prompt(`WhatsApp number for ${u.full_name} (for leave approval notifications):`, u.phone || "");
              if (phone === null) return;
              setError(null);
              run(() => updateUserPhoneAction(u.id, phone));
            }}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <button
            className="btn-ghost !px-1.5 !py-0.5 text-[11px]"
            title="Permissions & designation"
            onClick={() => openPerms(u)}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </button>
          <button
            className="btn-ghost !px-1.5 !py-0.5 text-[11px]"
            title="Reset password"
            onClick={() => { setResetTarget(u); setNewPassword(""); setError(null); }}
          >
            <Shield className="h-3.5 w-3.5" />
          </button>
          <button
            className={`btn-ghost !px-1.5 !py-0.5 text-[11px] ${u.is_active ? "!text-rose-400" : "!text-emerald-400"}`}
            onClick={() => run(() => toggleUserActiveAction(u.id, !u.is_active))}
          >
            {u.is_active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-slate-400">{subtitle}</p>
      </div>

      <SmartTable
        columns={columns}
        data={users}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        searchPlaceholder="Search members…"
        filterTabs={filterTabs}
        filterParam="role"
        searchParam="search"
        basePath={basePath}
        actions={
          <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => setModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Member
          </button>
        }
        emptyTitle="No members found"
        emptySubtitle="Try a different search or filter."
      />

      <Modal open={modal} onClose={() => setModal(false)} title="Add Team Member">
        {error && <p className="mb-2 rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}
        <form className="space-y-3" action={(fd) => run(() => createUserAction(fd), () => setModal(false))}>
          <div>
            <label className="label">Full name</label>
            <input name="full_name" required className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label">WhatsApp number <span className="text-slate-500 normal-case">(for leave approval alerts)</span></label>
            <input name="phone" inputMode="tel" placeholder="+91 …" className="input" />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <PasswordInput name="password" required minLength={6} />
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

      <Modal open={!!resetTarget} onClose={closeReset} title={`Reset Password — ${resetTarget?.full_name || ""}`}>
        {error && <p className="mb-2 rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Enter a new password for this user.</p>
          <div>
            <label className="label">New password</label>
            <PasswordInput minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button
            className="btn-primary w-full"
            disabled={pending || newPassword.length < 6}
            onClick={() => run(() => resetPasswordAction(resetTarget!.id, newPassword), closeReset)}
          >
            Save new password
          </button>
        </div>
      </Modal>

      <Modal open={!!permTarget} onClose={closePerms} title={`Permissions — ${permTarget?.full_name || ""}`}>
        {error && <p className="mb-2 rounded-lg bg-rose-400/10 text-rose-300 text-xs px-3 py-2">{error}</p>}
        <div className="space-y-4">
          <div>
            <label className="label">Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. Senior Writer" className="input" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Granular permissions</label>
              <button
                type="button"
                className="text-[11px] text-brand-300 hover:underline"
                onClick={() => setPermsState(DEFAULT_ROLE_PERMISSIONS[permTarget?.role_key || ""] ?? [])}
              >
                Reset to role defaults
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Effective = {permTarget?.role_label} defaults overridden below. Empty = inherit role.
            </p>
            <PermissionPicker value={perms} onChange={setPermsState} />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={closePerms} className="btn-ghost">Cancel</button>
            <button onClick={savePerms} className="btn-primary">
              Save permissions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
