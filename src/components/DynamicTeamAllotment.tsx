"use client";

import { useState } from "react";
import { UserPlus, X, Save } from "lucide-react";
import type { UserRow, ProjectRow } from "@/lib/types";
import { SearchableSelect } from "@/components/SearchableSelect";
import { DatePicker } from "@/components/DatePicker";
import { useToast } from "@/components/Toast";

const AVAILABLE_ROLES = [
  { key: "WRITER", label: "✍️ Writer" },
  { key: "DESIGNER", label: "🎨 Designer" },
  { key: "EDITOR", label: "🎬 Editor" },
  { key: "VIDEOGRAPHER", label: "📹 Videographer" },
  { key: "SMM", label: "📱 SMM" },
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

function blankRow(): TeamAllocationRow {
  return { id: uid(), role_key: "", user_id: null, deadline: "" };
}

/**
 * Fully manual team allotment builder. Always starts completely blank —
 * the Project Manager picks a role, then an employee, then a deadline,
 * and persists the batch with Save. Nothing is ever pre-filled or
 * auto-assigned.
 */
export function DynamicTeamAllotment({
  project,
  team,
  onSave,
}: {
  project: ProjectRow;
  team: UserRow[];
  onSave?: (rows: TeamAllocationRow[]) => void;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamAllocationRow[]>([blankRow()]);

  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length === 0 ? [blankRow()] : next;
    });
  }

  function updateRow(id: string, patch: Partial<TeamAllocationRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="rounded-xl border border-brand-300/25 bg-brand-300/[0.06] p-2">
      {/* Column headers — aligned to the row grid */}
      <div className="flex items-center gap-1.5 mb-1 px-0.5">
        <span className="w-[30%] text-[8px] font-semibold uppercase tracking-wider text-slate-500">Role</span>
        <span className="flex-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">Employee</span>
        <span className="w-[26%] text-[8px] font-semibold uppercase tracking-wider text-slate-500">Deadline</span>
        <span className="w-[22px] shrink-0" />
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => {
          const roleMembers = row.role_key
            ? team.filter((u) => u.role_key === row.role_key && u.is_active)
            : [];
          const disabled = !row.role_key;
          return (
            <div key={row.id} className="flex items-center gap-1.5">
              <div className="w-[30%] min-w-0">
                <SearchableSelect
                  options={AVAILABLE_ROLES.map((r) => ({ value: r.key, label: r.label }))}
                  value={row.role_key}
                  onChange={(v) => updateRow(row.id, { role_key: v, user_id: null, deadline: "" })}
                  placeholder="Role…"
                />
              </div>
              <div className={`flex-1 min-w-0 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
                {roleMembers.length > 0 ? (
                  <SearchableSelect
                    options={roleMembers.map((u) => ({ value: u.id, label: u.full_name, search: `${u.full_name} ${u.email || ""}` }))}
                    value={row.user_id || ""}
                    onChange={(v) => updateRow(row.id, { user_id: v || null })}
                    placeholder="Employee…"
                  />
                ) : (
                  <div className="input !py-1.5 h-8 text-[10px] text-slate-600 bg-white/[0.02] text-center">{row.role_key ? "No members" : "—"}</div>
                )}
              </div>
              <div className={`w-[26%] min-w-0 transition-opacity ${row.role_key && row.user_id ? "" : "opacity-40 pointer-events-none"}`}>
                <DatePicker
                  value={row.deadline || undefined}
                  onChange={(v) => updateRow(row.id, { deadline: v })}
                  placeholder="Deadline…"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors shrink-0 self-center"
                title="Remove"
                aria-label="Remove row"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5 mt-2">
        <button type="button" onClick={addRow} className="btn-secondary !py-1 text-[10px] flex-1 border-dashed">
          <UserPlus className="h-3 w-3" /> Add Team Member
        </button>
        <button
          type="button"
          onClick={() => {
            const filled = rows.filter((r) => r.role_key && r.user_id);
            if (filled.length === 0) {
              toast("Add at least one team member before saving.", "error");
              return;
            }
            const incomplete = rows.some((r) => (r.role_key && !r.user_id) || (!r.role_key && r.user_id));
            if (incomplete) {
              toast("Finish or remove incomplete rows before saving.", "error");
              return;
            }
            onSave?.(filled);
            toast("Team saved.", "success");
            setRows([blankRow()]);
          }}
          className="btn-primary !py-1 text-[10px] px-3"
        >
          <Save className="h-3 w-3" /> Save
        </button>
      </div>
    </div>
  );
}
