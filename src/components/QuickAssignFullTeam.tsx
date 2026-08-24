"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { ProjectRow, UserRow } from "@/lib/types";

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
}: {
  project: ProjectRow;
  team: UserRow[];
  onAssignAll: (assignments: { role_key: string; user_id: string | null }[]) => void;
  pending: boolean;
}) {
  const [quickDraft, setQuickDraft] = useState<Record<string, string>>({});

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
    <div className="rounded-lg border border-brand-300/30 bg-brand-300/[0.07] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <UserPlus className="h-3.5 w-3.5 text-brand-300" />
        <p className="text-xs font-semibold text-brand-200">Quick Assign Full Team</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {applicableRoles.map((qr) => (
          <div key={qr.key} className="space-y-0.5">
            <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <span>{qr.icon}</span>
              {qr.label}
            </label>
            <select
              className="input !py-1 text-xs"
              value={quickDraft[qr.key] || ""}
              onChange={(e) =>
                setQuickDraft((prev) => ({ ...prev, [qr.key]: e.target.value }))
              }
            >
              <option value="">Select…</option>
              {team
                .filter((u) => u.role_key === qr.key && u.is_active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
      <button
        className="btn-primary !py-1 text-xs w-full"
        disabled={pending || !hasAnySelection}
        onClick={assignAll}
      >
        <UserPlus className="h-3 w-3" /> Assign Team & Auto-Assign Tasks
      </button>
    </div>
  );
}
