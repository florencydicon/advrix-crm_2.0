"use client";

import { useState, useEffect } from "react";
import { UserPlus, X, Check, Calendar, Search } from "lucide-react";
import type { UserRow, ProjectRow } from "@/lib/types";
import { SearchableSelect } from "@/components/SearchableSelect";

/** Available roles for team allocation (keys must match roles table). */
const AVAILABLE_ROLES = [
  { key: "WRITER", label: "Content Writer", icon: "✍️" },
  { key: "DESIGNER", label: "Graphic Designer", icon: "🎨" },
  { key: "EDITOR", label: "Video Editor", icon: "🎬" },
  { key: "SMM", label: "Social Media Manager", icon: "📱" },
  { key: "VIDEOGRAPHER", label: "Videographer", icon: "📹" },
];

export interface TeamAllocationRow {
  role_key: string;
  user_id: string | null;
  deadline: string; // ISO date string YYYY-MM-DD
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
  onRowRemove: (roleKey: string) => void;
  initialAllocations?: TeamAllocationRow[];
}) {
  const [rows, setRows] = useState<TeamAllocationRow[]>(initialAllocations || []);

  function addRow() {
    setRows((prev) => {
      const newRow: TeamAllocationRow = {
        role_key: "",
        user_id: null,
        deadline: "",
      };
      onRowAdd(newRow);
      return [...prev, newRow];
    });
  }

  function removeRow(roleKey: string) {
    setRows((prev) => {
      const newRows = prev.filter((r) => r.role_key !== roleKey);
      onRowRemove(roleKey);
      return newRows;
    });
  }

  return (
    <div className="rounded-xl border border-brand-300/25 bg-brand-300/[0.06] p-4 space-y-3">
      {/* Add Row button */}
      <div className="flex items-center gap-2">
        <button
          onClick={addRow}
          className="btn-ghost !px-2 !py-1 text-xs font-medium text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1.5"
          title="Add Team Member"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add Team Member
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-[10px] text-slate-500">
          No team members assigned yet. Click "Add Team Member" to begin.
        </p>
      ) : null}

      {rows.map((row, rowIdx) => {
        const roleInfo = AVAILABLE_ROLES.find((r) => r.key === row.role_key);
        const isRoleSelected = !!row.role_key;
        const roleMembers = row.role_key
          ? team.filter((u) => u.role_key === row.role_key && u.is_active)
          : [];
        const selectedUserId = row.user_id;

        return (
          <div
            key={row.role_key || rowIdx}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2.5 min-w-0"
          >
            {/* Role Dropdown */}
            <div className="flex-1 min-w-0">
              <SearchableSelect
                name={`role_${rowIdx}`}
                options={
                  AVAILABLE_ROLES.map((r) => ({
                    value: r.key,
                    label: r.label,
                    search: r.label,
                  }))
                }
                value={row.role_key || ""}
                onChange={(v) => {
                  setRows((prev) => {
                    const newRows = [...prev];
                    newRows[rowIdx].role_key = v;
                    newRows[rowIdx].user_id = null;
                    newRows[rowIdx].deadline = "";
                    onRowAdd(newRows[rowIdx]);
                    return newRows;
                  });
                }}
                placeholder="Select role…"
              />
            </div>

            {/* Employee Dropdown — appears after role selected */}
            {isRoleSelected && roleMembers.length > 0 ? (
              <SearchableSelect
                name={`employee_${rowIdx}`}
                options={
                  roleMembers.map((u: UserRow) => ({
                    value: u.id,
                    label: u.full_name,
                    search: `${u.full_name} ${u.email || ""}`,
                  }))
                }
                value={selectedUserId || ""}
                onChange={(v) => {
                  setRows((prev) => {
                    const newRows = [...prev];
                    newRows[rowIdx].user_id = v || null;
                    onRowAdd(newRows[rowIdx]);
                    return newRows;
                  });
                }}
                placeholder="Select employee…"
              />
            ) : (
              /* placeholder when no role selected or no members */
              <SearchableSelect
                name={`employee_${rowIdx}`}
                options={[]}
                value={selectedUserId || ""}
                onChange={() => {}}
                placeholder={roleMembers.length === 0 ? "No employees in this role" : "Select role first…"}
              />
            )}

            {/* Deadline DatePicker */}
            <div className="flex items-center gap-2 w-48">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <input
                type="date"
                value={row.deadline || ""}
                onChange={(e) => {
                  setRows((prev) => {
                    const newRows = [...prev];
                    newRows[rowIdx].deadline = e.target.value;
                    onRowAdd(newRows[rowIdx]);
                    return newRows;
                  });
                }}
                className="input flex-1 min-w-0 text-xs py-1.5 rounded border border-white/10 bg-night-700/60 text-slate-300 focus:ring-2 focus:ring-brand-300/25"
                disabled={!isRoleSelected || !selectedUserId}
                placeholder="Set deadline"
              />
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeRow(row.role_key || `temp_${rowIdx}`)}
              className="btn-ghost !px-1.5 !py-1 text-xs text-rose-400 hover:text-rose-300 transition-colors shrink-0"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}