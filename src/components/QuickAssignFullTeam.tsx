"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { ProjectRow, UserRow } from "@/lib/types";
import { SearchableSelect } from "@/components/SearchableSelect";

const QUICK_ASSIGN_ROLES = [
  { key: "WRITER", label: "Content Writer", icon: "✍️" },
  { key: "DESIGNER", label: "Graphic Designer", icon: "🎨" },
  { key: "EDITOR", label: "Video Editor", icon: "🎬" },
  { key: "SMM", label: "Social Media Manager", icon: "📱" },
];

export default function QuickAssignFullTeam({
  project,
  team,
  onAssignAll,
  pending,
  initial,
}: {
  project: ProjectRow;
  team: UserRow[];
  onAssignAll: (assignments: { role_key: string; user_id: string | null }[]) => void;
  pending: boolean;
  /** Current allocations (role_key -> user_id) so the form starts pre-filled. */
  initial?: Record<string, string>;
}) {
  const [quickDraft, setQuickDraft] = useState<Record<string, string>>(initial || {});

  const applicableRoles = QUICK_ASSIGN_ROLES.filter((qr) =>
    team.some((u) => u.role_key === qr.key)
  );

  if (applicableRoles.length === 0) return null;

  function assignAll() {
    const assignments = applicableRoles.map((r) => ({
      role_key: r.key,
      user_id: quickDraft[r.key] || null,
    })).filter((a) => a.user_id);
    onAssignAll(assignments);
  }

  const hasAnySelection = applicableRoles.some((r) => quickDraft[r.key]);

  return (
    <div className="rounded-xl border border-brand-300/25 bg-brand-300/[0.06] p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-brand-300/15 flex items-center justify-center shrink-0">
            <UserPlus className="h-3.5 w-3.5 text-brand-300" />
          </span>
          <div>
            <p className="text-xs font-semibold text-brand-200 leading-tight">Team Allotment</p>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
              One member per role — tasks auto-route on assign.
            </p>
          </div>
        </div>
        {hasAnySelection && (
          <button
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            onClick={() => setQuickDraft({})}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {applicableRoles.map((qr) => {
          const members = team.filter((u) => u.role_key === qr.key && u.is_active);
          return (
            <div key={qr.key} className="rounded-lg border border-white/10 bg-night-850/60 p-2.5">
              <label className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-slate-200 flex items-center gap-1.5">
                  <span>{qr.icon}</span>
                  {qr.label}
                </span>
                <span className="text-[9px] text-slate-600 bg-white/5 rounded-full px-1.5 py-0.5">
                  {members.length} available
                </span>
              </label>
              <SearchableSelect
                options={members.map((u) => ({ value: u.id, label: u.full_name }))}
                value={quickDraft[qr.key] || ""}
                onChange={(v) => setQuickDraft((prev) => ({ ...prev, [qr.key]: v }))}
                placeholder="Select member…"
              />
            </div>
          );
        })}
      </div>

      <button
        className="btn-primary !py-1.5 text-xs w-full mt-3"
        disabled={pending || !hasAnySelection}
        onClick={assignAll}
      >
        <UserPlus className="h-3 w-3" /> Assign Team & Auto-Assign Tasks
      </button>
    </div>
  );
}
