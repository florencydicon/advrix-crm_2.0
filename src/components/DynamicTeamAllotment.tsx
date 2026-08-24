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
    <div className="rounded-lg border border-brand-300/25 bg-brand-300/[0.06] p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="h-6 w-6 rounded-md bg-brand-300/15 flex items-center justify-center shrink-0">
          <UserPlus className="h-3 w-3 text-brand-300" />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-brand-200 leading-none">Team Allotment</p>
          <p className="text-[9px] text-slate-500 leading-none mt-0.5">Role → employee → deadline</p>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const isRoleSelected = !!row.role_key;
          const roleMembers = isRoleSelected
            ? team.filter((u) => u.role_key === row.role_key && u.is_active)
            : [];
          const canPickDeadline = isRoleSelected && !!row.user_id;

          return (
            <div key={row.id} className="rounded-md border border-white/10 bg-night-850/70 p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <label className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-0.5 block">Role</label>
                  <SearchableSelect
                    options={AVAILABLE_ROLES.map((r) => ({ value: r.key, label: `${r.icon} ${r.label}` }))}
                    value={row.role_key}
                    onChange={(v) => updateRow(row.id, { role_key: v, user_id: null, deadline: "" })}
                    placeholder="Role…"
                  />
                </div>
                <div className={`flex-1 min-w-0 transition-all duration-200 ${isRoleSelected ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                  <label className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-0.5 block">Employee</label>
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
                        placeholder="Employee…"
                      />
                    ) : (
                      <div className="input !py-1.5 text-[11px] text-amber-300/80 bg-amber-400/5 border-amber-400/20">No members</div>
                    )
                  ) : (
                    <div className="input !py-1.5 text-[11px] text-slate-600 bg-white/[0.02]">Role first</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="self-end mb-0.5 p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors shrink-0"
                  title="Remove"
                  aria-label="Remove row"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className={`transition-all duration-200 ${canPickDeadline ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <label className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" /> Deadline
                </label>
                <DatePicker
                  value={row.deadline || undefined}
                  onChange={(v) => {
                    updateRow(row.id, { deadline: v });
                    if (row.role_key && row.user_id) onRowAdd({ ...row, deadline: v });
                  }}
                  placeholder={canPickDeadline ? "Set deadline…" : "Role & employee first…"}
                />
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" onClick={addRow} className="btn-secondary !py-1 text-[11px] w-full mt-2 border-dashed">
        <UserPlus className="h-3 w-3" /> Add Team Member
      </button>
    </div>
  );
}
