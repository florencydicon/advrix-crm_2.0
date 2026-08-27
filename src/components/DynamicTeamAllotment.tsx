"use client";

import { useState, useRef } from "react";
import { UserPlus, X, Save, GripVertical } from "lucide-react";
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
 * Team allotment builder. Pre-populates existing allocations from the project
 * so the PM sees what is already saved. New blank rows can be added below.
 */
export function DynamicTeamAllotment({
  project,
  team,
  initial,
  onSave,
}: {
  project: ProjectRow;
  team: UserRow[];
  initial?: { role_key: string; user_id: string; deadline?: string | null }[];
  onSave?: (rows: TeamAllocationRow[]) => void;
}) {
  const { toast } = useToast();

  const existingRows: TeamAllocationRow[] = (initial && initial.length > 0)
    ? initial.map((a) => ({
        id: uid(),
        role_key: a.role_key,
        user_id: a.user_id,
        deadline: a.deadline || "",
      }))
    : [blankRow()];

  const [rows, setRows] = useState<TeamAllocationRow[]>(existingRows);
  const dragId = useRef<string | null>(null);

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

  function onDragStart(id: string) {
    dragId.current = id;
  }
  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId.current || dragId.current === overId) return;
    setRows((prev) => {
      const fromIdx = prev.findIndex((r) => r.id === dragId.current);
      const toIdx = prev.findIndex((r) => r.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }
  function onDragEnd() {
    dragId.current = null;
  }

  return (
    <div className="rounded-xl border border-brand-300/25 bg-brand-300/[0.06] p-2">
      <p className="text-[10px] text-slate-500 mb-1">Drag <span className="inline-flex align-middle"><GripVertical className="h-3 w-3" /></span> to set priority — top is assigned first, next auto-chains in this order.</p>
      {/* Column headers — aligned to the row grid */}
      <div className="flex items-center gap-1.5 mb-1 px-0.5">
        <span className="w-5 shrink-0" />
        <span className="w-[30%] text-[8px] font-semibold uppercase tracking-wider text-slate-500">Role</span>
        <span className="flex-1 text-[8px] font-semibold uppercase tracking-wider text-slate-500">Employee</span>
        <span className="w-[28%] text-[8px] font-semibold uppercase tracking-wider text-slate-500">Deadline</span>
        <span className="w-[18px] shrink-0" />
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => {
          const roleMembers = row.role_key
            ? team.filter((u) => u.role_key === row.role_key && u.is_active)
            : [];
          const disabled = !row.role_key;
          return (
            <div
              key={row.id}
              draggable
              onDragStart={() => onDragStart(row.id)}
              onDragOver={(e) => onDragOver(e, row.id)}
              onDragEnd={onDragEnd}
              className="flex flex-col sm:flex-row sm:items-center gap-1.5 rounded-xl border border-white/5 sm:border-0 bg-white/[0.02] sm:bg-transparent p-2 sm:p-0.5 hover:bg-white/[0.03] transition-colors"
            >
              <div className="hidden sm:flex w-5 h-8 items-center justify-center cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 shrink-0" title={`Priority ${idx + 1} — drag to reorder`}>
                <GripVertical className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-1.5 sm:contents">
                <span className="sm:hidden w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">{idx + 1}</span>
                <span className="sm:hidden text-[10px] text-slate-500">Priority {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (idx > 0) {
                      setRows((prev) => {
                        const next = [...prev];
                        const [m] = next.splice(idx, 1);
                        next.splice(idx - 1, 0, m);
                        return next;
                      });
                    }
                  }}
                  disabled={idx === 0}
                  className="sm:hidden ml-auto p-1 rounded text-slate-500 hover:text-white disabled:opacity-30"
                  aria-label="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (idx < rows.length - 1) {
                      setRows((prev) => {
                        const next = [...prev];
                        const [m] = next.splice(idx, 1);
                        next.splice(idx + 1, 0, m);
                        return next;
                      });
                    }
                  }}
                  disabled={idx === rows.length - 1}
                  className="sm:hidden p-1 rounded text-slate-500 hover:text-white disabled:opacity-30"
                  aria-label="Move down"
                >
                  ↓
                </button>
                <span className="sm:hidden flex items-center gap-1 ml-1 cursor-grab text-slate-500" title="Drag to reorder">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="w-full sm:w-[30%] min-w-0">
                <SearchableSelect
                  options={AVAILABLE_ROLES.map((r) => ({ value: r.key, label: r.label }))}
                  value={row.role_key}
                  onChange={(v) => updateRow(row.id, { role_key: v, user_id: null, deadline: "" })}
                  placeholder="Role…"
                />
              </div>
              <div className={`w-full sm:flex-1 min-w-0 transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
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
              <div className={`w-full sm:w-[32%] min-w-0 transition-opacity ${row.role_key && row.user_id ? "" : "opacity-40 pointer-events-none"}`}>
                <DatePicker
                  value={row.deadline || undefined}
                  onChange={(v) => updateRow(row.id, { deadline: v })}
                  placeholder="Deadline…"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="p-2 sm:p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors shrink-0 self-center"
                title="Remove"
                aria-label="Remove row"
              >
                <X className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
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
