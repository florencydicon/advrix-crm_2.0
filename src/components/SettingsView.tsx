"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Users, ShieldCheck, KeyRound } from "lucide-react";
import type { UserRow } from "@/lib/types";
import type { FilterTab } from "@/components/SmartTable";
import TeamView from "@/components/TeamView";

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
        <p className="text-sm text-slate-500">Manage your account, team members, and permissions.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { setTab("users"); router.push("/settings"); }}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "users" ? "bg-ink text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Users className="h-4 w-4" /> Users & Roles
        </button>
        <button
          onClick={() => setTab("general")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "general" ? "bg-ink text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
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
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{sessionName}</p>
                <p className="text-xs text-slate-500">{sessionRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-brand-50 text-brand-700 px-4 py-3 text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              You are signed in with Super Admin privileges.
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 text-slate-600 px-4 py-3 text-sm">
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
              <p className="text-xs text-slate-400 pt-1">
                These fields are read-only. Contact your developer to change agency branding.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}