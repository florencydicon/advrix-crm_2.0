"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, Search, Trash2, Link as LinkIcon, X,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  getNotesAction,
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
  type NoteRow,
} from "@/lib/actions/notes";
import { RichTextEditor, RichText } from "@/components/RichText";
import { isEmptyRich, richToPlain } from "@/lib/rich";
import { Modal } from "@/components/ui";
import { useToast } from "@/components/Toast";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesView({
  userId,
  userName,
  roleKey,
  permissions,
}: {
  userId: string;
  userName: string;
  roleKey: string;
  permissions: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NoteRow | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(true);

  const selected = notes.find((n) => n.id === selectedId) || null;

  const fetchNotes = useCallback(async (q?: string) => {
    try {
      const res = await getNotesAction(q);
      if (res.notes) {
        setNotes(res.notes);
        if (selectedId && !res.notes.find((n) => n.id === selectedId)) {
          setSelectedId(null);
          setEditingTitle("");
          setEditingBody("");
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (selected) {
      setEditingTitle(selected.title);
      setEditingBody(selected.body);
      setEditingProjectId(selected.project_id);
    }
  }, [selected]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes(search || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchNotes]);

  function selectNote(note: NoteRow) {
    setSelectedId(note.id);
    setEditingTitle(note.title);
    setEditingBody(note.body);
    setEditingProjectId(note.project_id);
    setIsCreating(false);
    setMobileListOpen(false);
  }

  function startNew() {
    setSelectedId(null);
    setEditingTitle("");
    setEditingBody("");
    setEditingProjectId(null);
    setIsCreating(true);
    setMobileListOpen(false);
  }

  function save() {
    start(async () => {
      const trimmedTitle = editingTitle.trim() || "Untitled";
      if (isCreating) {
        const res = await createNoteAction(trimmedTitle, editingBody, editingProjectId);
        if (res.error) {
          toast(res.error, "error");
          return;
        }
        if (res.note) {
          setSelectedId(res.note.id);
          setIsCreating(false);
          toast("Note created.", "success");
        }
      } else if (selected) {
        const res = await updateNoteAction(selected.id, trimmedTitle, editingBody, editingProjectId);
        if (res.error) {
          toast(res.error, "error");
          return;
        }
        toast("Saved.", "success");
      }
      router.refresh();
      fetchNotes(search || undefined);
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    start(async () => {
      const res = await deleteNoteAction(deleteTarget.id);
      if (res.error) {
        toast(res.error, "error");
        return;
      }
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setEditingTitle("");
        setEditingBody("");
        setIsCreating(false);
      }
      setDeleteTarget(null);
      toast("Note deleted.", "success");
      router.refresh();
      fetchNotes(search || undefined);
    });
  }

  const hasUnsavedChanges = isCreating
    ? (editingTitle.trim() !== "" || !isEmptyRich(editingBody))
    : selected
      ? (editingTitle.trim() !== selected.title || editingBody !== selected.body)
      : false;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden btn-ghost !p-1.5"
          onClick={() => setMobileListOpen((o) => !o)}
        >
          {mobileListOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-300" />
            Notes
          </h1>
          <p className="text-xs text-slate-400">Personal &amp; collaborative workspace</p>
        </div>
        <button onClick={startNew} className="btn-primary !py-1.5 !px-3 text-xs">
          <Plus className="h-3.5 w-3.5" /> New Note
        </button>
      </div>

      <div className="flex gap-0 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden min-h-[calc(100vh-220px)]">
        {/* Sidebar — note list */}
        <div
          className={`${
            mobileListOpen ? "block" : "hidden"
          } lg:block w-full lg:w-[280px] shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col`}
        >
          <div className="p-2.5 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="input !pl-8 !py-1.5 !text-[11px]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] animate-pulse space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
                    <div className="h-2 w-1/2 rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="p-4 text-center">
                <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-[11px] text-slate-500">{search ? "No notes match your search." : "No notes yet. Create one!"}</p>
              </div>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => selectNote(note)}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/[0.04] transition-colors group ${
                    selectedId === note.id
                      ? "bg-brand-300/10 border-l-2 border-l-brand-300"
                      : "hover:bg-white/[0.04] border-l-2 border-l-transparent"
                  }`}
                >
                  <p className="text-xs font-medium text-white truncate">{note.title || "Untitled"}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {richToPlain(note.body).slice(0, 80) || "Empty"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-3.5 w-3.5 rounded-full bg-white/10 flex items-center justify-center text-[7px] font-bold text-slate-400">
                      {initials(note.author_name)}
                    </div>
                    <span className="text-[9px] text-slate-600">{timeAgo(note.updated_at)}</span>
                    {note.project_name && (
                      <span className="text-[9px] text-brand-300/60 flex items-center gap-0.5">
                        <LinkIcon className="h-2 w-2" /> {note.project_name}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor pane */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileListOpen && !selected ? "hidden lg:flex" : "flex"}`}>
          {!selected && !isCreating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select a note or create a new one</p>
                <button onClick={startNew} className="mt-3 btn-ghost text-xs text-brand-300">
                  <Plus className="h-3.5 w-3.5" /> New Note
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Title + actions bar */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Untitled"
                  className="flex-1 bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-600"
                />
                {selected && (selected.author_id === userId || roleKey === "SUPER_ADMIN") && (
                  <button
                    onClick={() => setDeleteTarget(selected)}
                    className="btn-ghost !p-1.5 text-rose-400 hover:text-rose-300"
                    title="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Metadata */}
              {(selected?.project_name || selected?.author_name) && (
                <div className="px-4 pb-2 flex items-center gap-3 text-[10px] text-slate-500">
                  {selected?.author_name && <span>by {selected.author_name}</span>}
                  {selected?.project_name && (
                    <span className="flex items-center gap-1 text-brand-300/60">
                      <LinkIcon className="h-2.5 w-2.5" /> {selected.project_name}
                    </span>
                  )}
                </div>
              )}

              {/* Rich text editor */}
              <div className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto custom-scrollbar">
                <RichTextEditor
                  value={editingBody}
                  onChange={setEditingBody}
                  placeholder="Start writing…"
                  minRows={8}
                  maxLength={50000}
                />
              </div>

              {/* Save bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
                <span className="text-[10px] text-slate-600">
                  {hasUnsavedChanges ? "Unsaved changes" : "All changes saved"}
                </span>
                <button
                  onClick={save}
                  disabled={pending || !hasUnsavedChanges}
                  className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-40"
                >
                  {pending ? "Saving…" : isCreating ? "Create note" : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Note">
        <p className="text-xs text-slate-400 mb-4">
          Permanently delete <strong className="text-white">{deleteTarget?.title || "Untitled"}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Cancel</button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="btn bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
