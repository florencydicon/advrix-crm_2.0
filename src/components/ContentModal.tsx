"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Save, CheckCircle2, Trash2, Building2, User } from "lucide-react";
import type { Client, ContentItem, UserRow } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  createContentItemAction,
  updateContentItemAction,
  setContentItemStatusAction,
  deleteContentItemAction,
} from "@/lib/actions/content";

/**
 * Standalone lightweight Content modal — deliberately NOT TaskModal.
 * Fields only: Client, Title, Content/Copy, Remarks, Assignee.
 * No team sequences, no stages, no pipeline coupling.
 */
export default function ContentModal({
  item,
  clients,
  team,
  canDelete,
  onClose,
  refresh,
}: {
  item: ContentItem | null;
  clients: Client[];
  team: UserRow[];
  canDelete: boolean;
  onClose: () => void;
  refresh: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(item?.client_id || "");
  const [title, setTitle] = useState(item?.title || "");
  const [body, setBody] = useState(item?.body || "");
  const [remarks, setRemarks] = useState(item?.remarks || "");
  const [assigneeId, setAssigneeId] = useState(item?.assignee_id || "");

  // Escape closes the modal.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const payload = () => ({
    clientId,
    title: title.trim(),
    body: body || null,
    remarks: remarks || null,
    assigneeId: assigneeId || null,
  });

  const save = (closeAfter: boolean) => {
    if (!clientId) {
      toast("Pick a client first.", "error");
      return;
    }
    if (!title.trim()) {
      toast("Title cannot be empty.", "error");
      return;
    }
    startTransition(async () => {
      const res = item
        ? await updateContentItemAction(item.id, payload())
        : await createContentItemAction(payload());
      if (!res.ok) {
        toast(res.error || "Could not save content.", "error");
        return;
      }
      toast(item ? "Content saved." : "Content added.");
      await refresh();
      if (closeAfter) onClose();
    });
  };

  const markCompleted = () => {
    startTransition(async () => {
      if (item) {
        const upd = await updateContentItemAction(item.id, payload());
        if (!upd.ok) {
          toast(upd.error || "Could not save content.", "error");
          return;
        }
        const st = await setContentItemStatusAction(item.id, "completed");
        if (!st.ok) {
          toast(st.error || "Could not move to History.", "error");
          return;
        }
      } else {
        if (!clientId) {
          toast("Pick a client first.", "error");
          return;
        }
        if (!title.trim()) {
          toast("Title cannot be empty.", "error");
          return;
        }
        const created = await createContentItemAction(payload());
        if (!created.ok || !created.id) {
          toast(created.error || "Could not save content.", "error");
          return;
        }
        const st = await setContentItemStatusAction(created.id, "completed");
        if (!st.ok) {
          toast(st.error || "Could not move to History.", "error");
          return;
        }
      }
      toast("Moved to History.");
      await refresh();
      onClose();
    });
  };

  const remove = () => {
    if (!item) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteContentItemAction(item.id);
      if (!res.ok) {
        toast(res.error || "Could not delete.", "error");
        return;
      }
      toast("Content deleted.");
      await refresh();
      onClose();
    });
  };

  const activeTeam = team.filter((u) => u.is_active);

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full bg-night-850 border-white/10 shadow-2xl flex flex-col h-[100dvh] max-h-[100dvh] border-t rounded-t-2xl md:h-auto md:max-w-lg md:max-h-[85vh] md:rounded-2xl md:border">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-night-850/95 backdrop-blur px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 mb-0.5">Content Management</div>
            <div className="text-base font-bold text-white leading-snug truncate">
              {item ? item.title : "Add Content"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex items-center gap-1.5 btn-ghost !px-2.5 !py-2 text-sm shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto pb-32 md:pb-4">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-brand-300" /> Client Name
            </p>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="input !py-2.5 text-sm w-full"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company || c.name}
                </option>
              ))}
            </select>
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Title</p>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Content title…"
              maxLength={200}
              className="input !py-2.5 text-sm w-full"
            />
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Content / Copy</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              placeholder="Draft the actual content / copy here…"
              className="input !py-2.5 text-sm resize-y min-h-[160px]"
            />
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Remarks / Feedback</p>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Notes or feedback…"
              className="input !py-2.5 text-sm resize-none"
            />
          </section>

          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-brand-300" /> Assignee (Writer)
            </p>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="input !py-2.5 text-sm w-full"
            >
              <option value="">Unassigned</option>
              {activeTeam.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.role_label}
                </option>
              ))}
            </select>
          </section>

          {/* Actions */}
          <section className="pt-1 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => save(true)}
                className="btn-primary !py-2.5 text-sm flex-1 min-w-[140px] disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Save Content
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={markCompleted}
                className="btn-secondary !py-2.5 text-sm flex-1 min-w-[140px] disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark as Completed
              </button>
            </div>
            {item && canDelete && (
              <button
                type="button"
                disabled={isPending}
                onClick={remove}
                className="btn-ghost !text-rose-400 !py-2 text-sm w-full disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Delete Content
              </button>
            )}
          </section>
        </div>
      </div>

      {/* Mobile FAB close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close modal"
        className="md:hidden fixed bottom-24 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl shadow-black/60 border border-gray-600 active:scale-95 transition-transform"
      >
        <X size={28} />
      </button>
    </div>
  );
}
