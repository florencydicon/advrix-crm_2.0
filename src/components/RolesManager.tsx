"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Plus, Pencil, Trash2, Loader2, KeyRound } from "lucide-react";
import { Modal } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  createRoleAction,
  updateRoleAction,
  deleteRoleAction,
  type RoleWithPerms,
} from "@/lib/actions/roles";
import { PERMISSION_GROUP_KEYS, DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

const DASHBOARDS = [
  { key: "admin", label: "Full admin dashboard" },
  { key: "pm", label: "Project manager dashboard" },
  { key: "sales", label: "Sales dashboard" },
  { key: "staff", label: "Staff (tasks only) dashboard" },
];

export default function RolesManager({ roles }: { roles: RoleWithPerms[] }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RoleWithPerms | null>(null);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-brand-300/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-brand-300" />
          </div>
          <h2 className="font-semibold text-white">Roles &amp; Permissions</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Create custom roles and grant granular permissions. Users inherit their role's permissions
          unless you override them per-user (from the Users tab). The Super Admin always has full
          access and cannot be edited.
        </p>

        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-300 text-night-950 px-4 py-2 text-sm font-medium hover:bg-brand-200 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Custom Role
        </button>

        <div className="grid md:grid-cols-2 gap-4 mt-5">
          {roles.map((role) => (
            <div key={role.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{role.label}</p>
                  <p className="text-[11px] font-mono text-brand-300/80">{role.key}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${role.builtin ? "bg-white/10 text-slate-300" : "bg-brand-300/15 text-brand-300"}`}>
                  {role.builtin ? "BUILT-IN" : "CUSTOM"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {(role.permissions.length === 0
                  ? ["no permissions"]
                  : role.permissions
                ).map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300 font-mono">
                    {p}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-500">{role.user_count} user(s)</span>
                <div className="flex items-center gap-2">
                  {!role.builtin && (
                    <button
                      onClick={() => start(async () => {
                        const res = await deleteRoleAction(role.key);
                        if (res.error) toast(res.error, "error");
                        else { toast(`Role "${role.key}" deleted.`, "success"); setEditing(null); }
                      })}
                      disabled={pending || role.user_count > 0}
                      title={role.user_count > 0 ? "Reassign users before deleting" : "Delete role"}
                      className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 text-rose-300 px-2.5 py-1 text-xs hover:bg-rose-400/10 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                  {!role.builtin && (
                    <button
                      onClick={() => setEditing(role)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 text-slate-300 px-2.5 py-1 text-xs hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                  {role.builtin && role.key !== "SUPER_ADMIN" && (
                    <button
                      onClick={() => setEditing(role)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 text-slate-300 px-2.5 py-1 text-xs hover:bg-white/10 transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Edit Permissions
                    </button>
                  )}
                  {role.key === "SUPER_ADMIN" && (
                    <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                      <KeyRound className="h-3 w-3" /> Full access
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {creating && (
        <CreateRoleForm
          onClose={() => setCreating(false)}
          onCreated={(key) => { setCreating(false); toast(`Role "${key}" created.`, "success"); }}
        />
      )}

      {editing && (
        <EditRoleForm
          role={editing}
          onClose={() => setEditing(null)}
          onSaved={(key) => { setEditing(null); toast(`Role "${key}" updated.`, "success"); }}
        />
      )}
    </div>
  );
}

function CreateRoleForm({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [dashboard, setDashboard] = useState("staff");
  const [perms, setPerms] = useState<string[]>(DEFAULT_ROLE_PERMISSIONS.WRITER || []);

  async function submit() {
    const res = await createRoleAction({ key, label, dashboard, permissions: perms });
    if (res.error) toast(res.error, "error");
    else onCreated(key.trim().toUpperCase());
  }

  return (
    <Modal open onClose={onClose} title="Create Custom Role">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Role key</label>
            <input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="e.g. ACCOUNTANT" className="input font-mono" />
          </div>
          <div>
            <label className="label">Display label</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Accountant" className="input" />
          </div>
        </div>
        <div>
          <label className="label">Dashboard layout</label>
          <select value={dashboard} onChange={(e) => setDashboard(e.target.value)} className="input">
            {DASHBOARDS.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </div>

        {dashboard !== "admin" && <PermissionPicker value={perms} onChange={setPerms} />}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button
            onClick={() => start(submit)}
            disabled={pending || !key.trim() || !label.trim()}
            className="btn-primary"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Role
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditRoleForm({
  role,
  onClose,
  onSaved,
}: {
  role: RoleWithPerms;
  onClose: () => void;
  onSaved: (key: string) => void;
}) {
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [label, setLabel] = useState(role.label);
  const [dashboard, setDashboard] = useState(role.dashboard);
  const [perms, setPerms] = useState<string[]>(role.permissions);
  const readonly = role.key === "SUPER_ADMIN";

  async function submit() {
    const res = await updateRoleAction(role.key, { label, dashboard, permissions: perms });
    if (res.error) toast(res.error, "error");
    else onSaved(role.key);
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${role.label} (${role.key})`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Display label</label>
            <input value={label} disabled={readonly} onChange={(e) => setLabel(e.target.value)} className="input disabled:opacity-50" />
          </div>
          <div>
            <label className="label">Dashboard layout</label>
            <select value={dashboard} disabled={readonly} onChange={(e) => setDashboard(e.target.value)} className="input disabled:opacity-50">
              {DASHBOARDS.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>
        {readonly ? (
          <p className="text-xs text-emerald-300 flex items-center gap-1.5">
            <KeyRound className="h-4 w-4" /> Super Admin always has full access; permissions are not editable.
          </p>
        ) : (
          <PermissionPicker value={perms} onChange={setPerms} />
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={() => start(submit)} disabled={pending || !label.trim()} className="btn-primary">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function PermissionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(key: string) {
    onChange(
      hasPermission(value, key) ? value.filter((k) => k !== key) : [...value, key]
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
      {PERMISSION_GROUP_KEYS.map(({ group, items }) => (
        <div key={group}>
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">{group}</p>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {items.map((p) => {
              const active = hasPermission(value, p.key);
              return (
                <label key={p.key} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer transition-colors ${active ? "border-brand-300/40 bg-brand-300/[0.07]" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggle(p.key)}
                    className="mt-0.5 accent-emerald-400"
                  />
                  <span className="min-w-0">
                    <span className="block text-[11px] font-mono text-brand-300/90 truncate">{p.key}</span>
                    <span className="block text-[10px] text-slate-400 leading-tight">{p.label}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}