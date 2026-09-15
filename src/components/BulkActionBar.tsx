"use client";

import { useState } from "react";
import { Users, Trash2, Tag, X, Check, ArrowRight, Undo2 } from "lucide-react";
import type { UserRow } from "@/lib/types";

export interface BulkStatusOption {
  value: string;
  label: string;
}

/** A person a selected task can be moved to/back — only assigned members. */
export interface StageOption {
  id: string;
  full_name: string;
  role_label?: string;
}

/**
 * Reusable sticky bulk-action bar. Rendered when selectedRows.length > 0.
 * Parents own selection state + server calls; this bar only collects intent:
 *  - Assign Team → member multi-pick popover → onAssign(memberIds)
 *  - Change Status → status dropdown → onStatus(status)
 *  - Delete → confirm → onDelete()
 */
export default function BulkActionBar({
  selectedCount,
  team,
  canAssign,
  canDelete,
  statusOptions,
  statusLabel = "Status",
  singleAssign = false,
  assignLabel = "Assign Team",
  canStage = false,
  stageOptions,
  onAssign,
  onDelete,
  onStatus,
  onStage,
  onMoveBack,
  onMoveBackTo,
  onClear,
}: {
  selectedCount: number;
  team: UserRow[];
  canAssign: boolean;
  canDelete: boolean;
  statusOptions: BulkStatusOption[];
  statusLabel?: string;
  singleAssign?: boolean;
  assignLabel?: string;
  canStage?: boolean;
  stageOptions?: StageOption[];
  onAssign: (memberIds: string[]) => Promise<void>;
  onDelete: () => Promise<void>;
  onStatus: (status: string) => Promise<void>;
  onStage?: (memberId: string) => Promise<void>;
  onMoveBack?: () => Promise<void>;
  onMoveBackTo?: (memberId: string) => Promise<void>;
  onClear: () => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [pickedStage, setPickedStage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (selectedCount === 0) return null;

  // Stage/move-back candidates: the people actually assigned to the selection
  // (fallback to the whole team when the parent doesn't scope it).
  const stageList: StageOption[] = stageOptions
    ? stageOptions
    : team
        .filter((u) => u.is_active)
        .map((u) => ({ id: u.id, full_name: u.full_name, role_label: u.role_label }));

  const togglePick = (id: string) =>
    setPicked((prev) =>
      singleAssign
        ? prev.includes(id)
          ? []
          : [id]
        : prev.includes(id)
          ? prev.filter((m) => m !== id)
          : [...prev, id]
    );

  const runAssign = async () => {
    if (picked.length === 0 || busy) return;
    setBusy(true);
    try {
      await onAssign(picked);
      setPicked([]);
      setAssignOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    if (busy) return;
    if (!window.confirm(`Delete ${selectedCount} selected task${selectedCount === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await onDelete();
    } finally {
      setBusy(false);
    }
  };

  const runStatus = async (status: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await onStatus(status);
      setStatusOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const runStage = async () => {
    if (busy || !pickedStage || !onStage) return;
    setBusy(true);
    try {
      await onStage(pickedStage);
      setStageOpen(false);
      setPickedStage("");
    } finally {
      setBusy(false);
    }
  };

  // Move Back handlers removed - only single Stage remains

  return (
    <div className="sticky top-0 z-20 rounded-xl border border-brand-300/30 bg-night-850/95 backdrop-blur px-3 py-2 shadow-lg shadow-black/30">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {selectedCount} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] text-slate-400 hover:text-white transition-colors"
        >
          Clear
        </button>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {canAssign && (
            <div className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setAssignOpen((o) => !o); setStatusOpen(false); setStageOpen(false); }}
                className="btn-ghost !py-1.5 !px-2.5 text-xs disabled:opacity-50"
              >
                <Users className="h-3.5 w-3.5" /> {assignLabel}
              </button>
              {assignOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAssignOpen(false)} />
                  <div className="absolute z-20 right-0 mt-2 w-60 rounded-xl border border-white/10 bg-night-850 shadow-xl shadow-black/40 overflow-hidden">
                    <div className="max-h-56 overflow-y-auto p-1.5">
                      {team.filter((u) => u.is_active).map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={picked.includes(u.id)}
                            onChange={() => togglePick(u.id)}
                            className="h-3.5 w-3.5 accent-emerald-400"
                          />
                          <span className="min-w-0 flex-1 truncate">{u.full_name}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-[80px]">{u.role_label}</span>
                        </label>
                      ))}
                      {team.filter((u) => u.is_active).length === 0 && (
                        <p className="px-2 py-3 text-xs text-slate-500">No active team members.</p>
                      )}
                    </div>
                    <div className="border-t border-white/10 p-2">
                      <button
                        type="button"
                        disabled={busy || picked.length === 0}
                        onClick={runAssign}
                        className="btn-primary w-full !py-1.5 text-xs disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Apply to {selectedCount}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {statusOptions.length > 0 && (
            <div className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setStatusOpen((o) => !o); setAssignOpen(false); setStageOpen(false); }}
                className="btn-ghost !py-1.5 !px-2.5 text-xs disabled:opacity-50"
              >
                <Tag className="h-3.5 w-3.5" /> {statusLabel}
              </button>
              {statusOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStatusOpen(false)} />
                  <div className="absolute z-20 right-0 mt-2 w-52 rounded-xl border border-white/10 bg-night-850 shadow-xl shadow-black/40 overflow-hidden p-1.5">
                    {statusOptions.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={busy}
                        onClick={() => runStatus(s.value)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {canStage && onStage && (
            <div className="relative">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setStageOpen((o) => !o); setAssignOpen(false); setStatusOpen(false); }}
                className="btn-ghost !py-1.5 !px-2.5 text-xs disabled:opacity-50"
              >
                <ArrowRight className="h-3.5 w-3.5" /> Stage
              </button>
              {stageOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setStageOpen(false)} />
                  <div className="absolute z-20 right-0 mt-2 w-[340px] rounded-xl border border-white/10 bg-night-850 shadow-xl shadow-black/40 overflow-hidden">
                    {stageList.length === 0 ? (
                      <p className="px-4 py-6 text-xs text-slate-500 text-center">Selected tasks have no assigned members.</p>
                    ) : (
                      <>
                        {/* Hiring-stages style progress bar */}
                        <div className="px-4 pt-4 pb-2">
                          <div className="relative flex items-center justify-between">
                            {/* track */}
                            <div className="absolute left-4 right-4 top-[14px] h-0.5 bg-white/10 rounded-full" />
                            {/* progress fill - animated */}
                            <div
                              className="absolute left-4 top-[14px] h-0.5 bg-gradient-to-r from-brand-300 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: pickedStage
                                  ? `${(stageList.findIndex((s) => s.id === pickedStage) / Math.max(1, stageList.length - 1)) * (100 - (32 / 3.4))}%`
                                  : "0%",
                                maxWidth: "calc(100% - 32px)",
                              }}
                            />
                            {stageList.map((u, idx) => {
                              const isPicked = pickedStage === u.id;
                              const isPast = pickedStage ? idx < stageList.findIndex((s) => s.id === pickedStage) : false;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setPickedStage(u.id)}
                                  className="relative z-10 flex flex-col items-center gap-1.5 group"
                                >
                                  <span
                                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-300 ease-out cursor-pointer
                                      ${isPicked
                                        ? "bg-brand-300 border-brand-300 text-night-950 scale-110 shadow-lg shadow-brand-300/20"
                                        : isPast
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : "bg-night-850 border-white/20 text-slate-400 group-hover:border-brand-300/50 group-hover:text-slate-200 group-hover:scale-105"}`}
                                  >
                                    {isPast ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                                  </span>
                                  <span className={`text-[10px] font-medium leading-none max-w-[70px] truncate transition-colors duration-200 ${isPicked ? "text-brand-300" : "text-slate-400 group-hover:text-slate-200"}`}>
                                    {u.full_name.split(" ")[0]}
                                  </span>
                                  <span className="text-[8px] text-slate-500 max-w-[70px] truncate">{u.role_label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Clickable list fallback - also animated */}
                        <div className="max-h-40 overflow-y-auto px-1.5 pb-1">
                          {stageList.map((u) => {
                            const isPicked = pickedStage === u.id;
                            return (
                              <button
                                key={u.id}
                                type="button"
                                disabled={busy}
                                onClick={() => setPickedStage(u.id)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all duration-200 cursor-pointer
                                  ${isPicked ? "bg-brand-300 text-night-950 shadow-md scale-[0.98]" : "text-slate-300 hover:bg-white/[0.06] hover:translate-x-0.5"}`}
                              >
                                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors ${isPicked ? "bg-night-950 text-brand-300" : "bg-white/10 text-slate-400"}`}>
                                  {stageList.findIndex((s) => s.id === u.id) + 1}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium">{u.full_name}</span>
                                <span className={`text-[10px] truncate max-w-[90px] ${isPicked ? "text-night-950/70" : "text-slate-500"}`}>{u.role_label}</span>
                                {isPicked && <Check className="h-3.5 w-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    <div className="border-t border-white/10 p-2 bg-white/[0.02]">
                      <button
                        type="button"
                        disabled={busy || !pickedStage}
                        onClick={runStage}
                        className="btn-primary w-full !py-2 text-xs disabled:opacity-50 shadow-lg transition-all duration-200 hover:shadow-brand-300/20 hover:scale-[0.99] active:scale-[0.97]"
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> Move {selectedCount} to stage {pickedStage ? `· ${stageList.find((s) => s.id === pickedStage)?.full_name.split(" ")[0]}` : ""}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Move Back options removed - only single Stage option remains per requirement */}

          {canDelete && (
            <button
              type="button"
              disabled={busy}
              onClick={runDelete}
              className="btn-ghost !py-1.5 !px-2.5 text-xs !text-rose-400 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}

          <button
            type="button"
            onClick={onClear}
            aria-label="Clear selection"
            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
