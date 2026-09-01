"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowLeft, Trash2, CheckCircle2, CalendarDays, Save, Plus, X, Users } from "lucide-react";
import { StatusBadge, PriorityBadge } from "@/components/ui";
import { RichText, RichTextEditor } from "@/components/RichText";
import {
  updateMasterTaskOverviewAction,
  setMasterTaskDeadlineAction,
  saveMasterTaskRemarksAction,
  completeMasterTaskAction,
  deleteMasterTaskAction,
  setMasterTaskTeamAction,
} from "@/lib/actions/masterboard";
import type { MasterRow } from "@/lib/actions/masterboard";
import type { UserRow } from "@/lib/types";
import { formatClientName } from "@/lib/utils";

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
const AVATAR_COLORS = [
  "bg-emerald-500/20 text-emerald-300",
  "bg-sky-500/20 text-sky-300",
  "bg-violet-500/20 text-violet-300",
  "bg-rose-500/20 text-rose-300",
  "bg-amber-500/20 text-amber-300",
  "bg-teal-500/20 text-teal-300",
];
function avatarClass(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Full-screen (100% x 100%) mobile task detail modal.
 * Fixed header (Back + centered title), scrollable gap-6 body, sticky footer
 * with Mark Complete + Save. Only rendered below md (<768px).
 */
export default function TaskDetailMobile({
  task,
  team,
  canManage,
  onClose,
  onChanged,
}: {
  task: MasterRow | null;
  team: UserRow[];
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [description, setDescription] = useState<string | null>("");
  const [remarks, setRemarks] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [searchTeam, setSearchTeam] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setDescription(task?.description ?? "");
    setRemarks(task?.remarks ?? "");
    setDeadline(task?.due_date?.slice(0, 10) ?? "");
    setToast(null);
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    setSelected(task.assigned_to ? [task.assigned_to] : []);
  }, [task?.id]);

  if (!task) return null;
  const current: MasterRow = task;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }
  function saveOverview() {
    startTransition(async () => {
      const res = await updateMasterTaskOverviewAction(current.id, {
        description: description !== current.description ? description : undefined,
      });
      if (res.ok) { flash("Saved"); onChanged(); } else flash(res.error || "Failed");
    });
  }
  function saveDeadline() {
    startTransition(async () => {
      const res = await setMasterTaskDeadlineAction(current.id, deadline ? deadline : null);
      if (res.ok) { flash("Deadline saved"); onChanged(); } else flash("Failed");
    });
  }
  function saveRemarks() {
    startTransition(async () => {
      const res = await saveMasterTaskRemarksAction(current.id, remarks);
      if (res.ok) { flash("Remarks saved"); onChanged(); } else flash("Failed");
    });
  }
  function toggleMember(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function saveTeam() {
    startTransition(async () => {
      const res = await setMasterTaskTeamAction(current.id, selected);
      if (res.ok) { flash("Team saved"); onChanged(); } else flash("Failed");
    });
  }
  function doComplete() {
    if (!confirm("Mark this task as completed?")) return;
    startTransition(async () => {
      const res = await completeMasterTaskAction(current.id);
      if (res.ok) { flash("Completed"); onChanged(); } else flash(res.error || "Failed");
    });
  }
  function doDelete() {
    if (!confirm("Delete this task permanently?")) return;
    startTransition(async () => {
      const res = await deleteMasterTaskAction(current.id);
      if (res.ok) { onClose(); onChanged(); } else flash(res.error || "Failed");
    });
  }
  const filteredTeam = team.filter((m) =>
    m.full_name.toLowerCase().includes(searchTeam.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-night-900">
      {/* Fixed header */}
      <header className="shrink-0 flex items-center gap-2 px-3 py-3 border-b border-white/[0.06] bg-night-850">
        <button
          onClick={onClose}
          className="shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-200 hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" /> Back
        </button>
        <h2 className="flex-1 text-center text-sm font-semibold text-white truncate px-1">
          {current.title}
        </h2>
        <span className="w-[64px] shrink-0" aria-hidden />
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {toast && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-3 py-2">
            {toast}
          </div>
        )}

        {/* Meta */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 truncate">
            {formatClientName(current.client_company, current.client_name)}
            <span className="mx-1 opacity-50">/</span>
            {current.project_name}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={current.status} />
            <PriorityBadge priority={current.priority} />
            {current.overdue && <span className="badge bg-rose-500/15 text-rose-300">Overdue</span>}
          </div>
        </div>

        {/* Description */}
        <section className="space-y-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Description
          </label>
          <RichTextEditor value={description ?? ""} onChange={setDescription} minRows={2} disabled={!canManage} />
          {canManage && (
            <div className="flex items-center gap-2">
              <button onClick={saveOverview} className="btn-ghost !text-xs">
                <Save className="h-3.5 w-3.5" /> Save description
              </button>
            </div>
          )}
        </section>

        {/* Deadline */}
        <section className="space-y-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Deadline
          </label>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={!canManage}
              className="input !w-auto flex-1"
            />
            {canManage && (
              <button onClick={saveDeadline} className="btn-ghost !text-xs">
                Save
              </button>
            )}
          </div>
        </section>

        {/* Team sequence */}
        <section className="space-y-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Team sequence
          </label>
          <div className="flex flex-wrap gap-2">
            {selected.map((id) => {
              const m = team.find((x) => x.id === id);
              if (!m) return null;
              return (
                <button
                  key={id}
                  onClick={() => canManage && toggleMember(id)}
                  disabled={!canManage}
                  className="flex items-center gap-1.5 rounded-full bg-white/5 ring-1 ring-white/10 pl-1 pr-2 py-1.5 text-xs text-slate-200 disabled:opacity-70"
                >
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${avatarClass(m.full_name)}`}>
                    {initials(m.full_name)}
                  </span>
                  {m.full_name}
                  {canManage && <X className="h-3 w-3 text-slate-400" />}
                </button>
              );
            })}
            {selected.length === 0 && <span className="text-xs text-slate-600">No assignees</span>}
          </div>
          {canManage && (
            <>
              <input
                className="input !py-2 !text-sm w-full"
                placeholder="Search team…"
                value={searchTeam}
                onChange={(e) => setSearchTeam(e.target.value)}
              />
              <ul className="max-h-44 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/[0.06]">
                {filteredTeam.map((m) => {
                  const on = selected.includes(m.id);
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => toggleMember(m.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-white/5 transition-colors ${on ? "text-white" : "text-slate-400"}`}
                      >
                        <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] ${avatarClass(m.full_name)}`}>
                          {initials(m.full_name)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block truncate">{m.full_name}</span>
                          <span className="block text-[11px] text-slate-600">{m.role_label}</span>
                        </span>
                        <Plus className={`h-4 w-4 ${on ? "text-emerald-400" : "text-slate-600"}`} />
                      </button>
                    </li>
                  );
                })}
                {filteredTeam.length === 0 && (
                  <li className="px-3 py-2 text-xs text-slate-600">No members found</li>
                )}
              </ul>
              <button onClick={saveTeam} className="btn-ghost !text-xs">
                <Users className="h-3.5 w-3.5" /> Save team
              </button>
            </>
          )}
        </section>

        {/* Remarks */}
        <section className="space-y-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Remarks
          </label>
          <RichTextEditor value={remarks} onChange={setRemarks} minRows={2} disabled={!canManage} />
          {canManage && (
            <button onClick={saveRemarks} className="btn-ghost !text-xs">
              <Save className="h-3.5 w-3.5" /> Save remarks
            </button>
          )}
          {current.remarks && current.remarks !== remarks && (
            <div className="mt-2 text-xs text-slate-500">
              <RichText html={current.remarks} className="mt-1 text-slate-400" />
            </div>
          )}
        </section>
      </div>

      {/* Sticky footer */}
      <footer className="shrink-0 border-t border-white/[0.06] bg-night-850 px-4 py-3 flex items-center gap-2">
        {canManage && (
          <button onClick={doDelete} className="btn-ghost !text-rose-300">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
        <div className="flex-1" />
        {(canManage || current.assigned_to) && (
          <button
            onClick={doComplete}
            disabled={pending}
            className="btn-primary flex-1 justify-center !py-2.5 text-sm"
          >
            <CheckCircle2 className="h-4 w-4" /> Mark complete
          </button>
        )}
      </footer>
    </div>
  );
}
