"use client";

import { useState } from "react";
import { UserPlus, X, Calendar } from "lucide-react";
import type { UserRow, ProjectRow } from "@/lib/types";
import { SearchableSelect } from "@/components/SearchableSelect";
import { DatePicker } from "@/components/DatePicker";

const AVAILABLE_ROLES = [
  { key: "WRITER", label: "Content Writer", icon: "✍️" },
  { key: "DESIGNER", label: "Graphic Designer", icon: "🎨" },
  { key: "EDITOR", label: "Video Editor", icon: "🎬" },
  { key: "VIDEOGRAPHER", label: "Videographer", icon: "📹" },
  { key: "SMM", label: "Social Media Manager", icon: "📱" },
];

export interface TeamAllocationRow {
  id: string;
  role_key: string;
  user_id: string | null;
  deadline: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function DynamicTeamAllotment({
  project,
  team,
  onRowAdd,
  onRowRemove,
  initialAllocations,
}: {
  project: ProjectRow;
  team: UserRow[];
  onRowAdd: (row: TeamAllocationRow) => void;
  onRowRemove: (id: string) => void;
  initialAllocations?: TeamAllocationRow[];
}) {
  const [rows, setRows] = useState<TeamAllocationRow[]>(() => {
    if (initialAllocations && initialAllocations.length > 0) return initialAllocations;
    return [{ id: uid(), role_key: "", user_id: null, deadline: "" }];
  });

  function addRow() {
    setRows((prev) => [...prev, { id: uid(), role_key: "", user_id: null, deadline: "" }]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length === 0 ? [{ id: uid(), role_key: "", user_id: null, deadline: "" }] : next;
    });
    onRowRemove(id);
  }

  function updateRow(id: string, patch: Partial<TeamAllocationRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="rounded-xl border border-brand-300/25 bg-brand-300/[0.06] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-7 w-7 rounded-lg bg-brand-300/15 flex items-center justify-center shrink-0">
          <UserPlus className="h-3.5 w-3.5 text-brand-300" />
        </span>
        <div>
          <p className="text-xs font-semibold text-brand-200 leading-tight">Team Allotment</p>
          <p className="text-[10px] text-slate-500 leading-tight">Select role → employee → deadline. Add rows as needed.</p>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const isRoleSelected = !!row.role_key;
          const roleMembers = isRoleSelected
            ? team.filter((u) => u.role_key === row.role_key && u.is_active)
            : [];
          const canPickEmployee = isRoleSelected && roleMembers.length > 0;
          const canPickDeadline = isRoleSelected && !!row.user_id;

          return (
            <div
              key={row.id}
              className="rounded-lg border border-white/10 bg-night-850/70 p-3 space-y-2.5"
            >
              {/* Row 1 — Role + Employee side-by-side */}
              <div className="flex items-center gap-2.5">
                <div className="flex-1 min-w-0">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
                    Role
                  </label>
                  <SearchableSelect
                    options={AVAILABLE_ROLES.map((r) => ({ value: r.key, label: `${r.icon}  ${r.label}` }))}
                    value={row.role_key}
                    onChange={(v) => {
                      updateRow(row.id, { role_key: v, user_id: null, deadline: "" });
                    }}
                    placeholder="Select role…"
                  />
                </div>

                {/* Employee — appears only after role is selected */}
                <div className={`flex-1 min-w-0 transition-all duration-200 ${isRoleSelected ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1 block">
                    Employee
                  </label>
                  {isRoleSelected ? (
                    roleMembers.length > 0 ? (
                      <SearchableSelect
                        options={roleMembers.map((u) => ({ value: u.id, label: u.full_name, search: `${u.full_name} ${u.email || ""}` }))}
                        value={row.user_id || ""}
                        onChange={(v) => {
                          const next = { ...row, user_id: v || null };
                          updateRow(row.id, { user_id: v || null });
                          if (v) onRowAdd({ ...next, user_id: v });
                        }}
                        placeholder="Select employee…"
                      />
                    ) : (
                      <div className="input !py-2 text-xs text-amber-300/80 bg-amber-400/5 border-amber-400/20">
                        No active members in this role
                      </div>
                    )
                  ) : (
                    <div className="input !py-2 text-xs text-slate-600 bg-white/[0.02]">Select a role first</div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="self-end mb-0.5 p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors shrink-0"
                  title="Remove this row"
                  aria-label="Remove row"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Row 2 — Deadline directly below the selection row */}
              <div className={`transition-all duration-200 ${canPickDeadline ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Deadline for this assignment
                </label>
                <DatePicker
                  value={row.deadline || undefined}
                  onChange={(v) => {
                    updateRow(row.id, { deadline: v });
                    if (row.role_key && row.user_id) onRowAdd({ ...row, deadline: v });
                  }}
                  placeholder={canPickDeadline ? "Set deadline…" : "Select role & employee first…"}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="btn-secondary !py-1.5 text-xs w-full mt-3 border-dashed"
      >
        <UserPlus className="h-3.5 w-3.5" /> Add Team Member
      </button>
    </div>
  );
}
