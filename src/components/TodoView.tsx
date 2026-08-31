"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare, Plus, Trash2, CalendarDays, UserCircle2, StickyNote,
  ListTodo, Sunrise, CalendarRange, Loader2,
} from "lucide-react";
import {
  getTodosAction,
  createTodoAction,
  updateTodoAction,
  toggleTodoAction,
  deleteTodoAction,
  getTodoAssigneeOptionsAction,
  type TodoRow,
  type TodoFilter,
} from "@/lib/actions/todos";
import { Modal } from "@/components/ui";
import { useToast } from "@/components/Toast";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function fmtDue(date: string | null) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const FILTERS: { key: TodoFilter | "all"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All", icon: ListTodo },
  { key: "today", label: "Today", icon: Sunrise },
  { key: "week", label: "This Week", icon: CalendarRange },
  { key: "year", label: "This Year", icon: CalendarDays },
];

interface EditorState {
  id?: string;
  title: string;
  notes: string;
  assigneeId: string;
  dueDate: string;
}

export default function TodoView({ permissions }: { permissions: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();

  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [allTodos, setAllTodos] = useState<TodoRow[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TodoFilter | "all">("all");
  const [quick, setQuick] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TodoRow | null>(null);

  const applyFilter = useCallback((list: TodoRow[], f: TodoFilter | "all") => {
    if (f === "all") return list;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const inRange = (d: string | null, start: Date, endExclusive: Date) => {
      if (!d) return false;
      const dt = new Date(d + "T00:00:00");
      return dt >= start && dt < endExclusive;
    };
    const nextWeek = new Date(startOfWeek);
    nextWeek.setDate(startOfWeek.getDate() + 7);
    const nextYear = new Date(startOfYear.getFullYear() + 1, 0, 1);
    return list.filter((t) =>
      f === "today" ? inRange(t.due_date, startOfDay, new Date(startOfDay.getTime() + 86400000))
      : f === "week" ? inRange(t.due_date, startOfWeek, nextWeek)
      : inRange(t.due_date, startOfYear, nextYear)
    );
  }, []);

  const fetchTodos = useCallback(async () => {
    try {
      const [res, opts] = await Promise.all([
        getTodosAction(),
        getTodoAssigneeOptionsAction(),
      ]);
      if (res.todos) {
        setAllTodos(res.todos);
        setTodos(applyFilter(res.todos, filter));
      }
      if (opts.users) setAssigneeOptions(opts.users);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter, applyFilter]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  function changeFilter(f: TodoFilter | "all") {
    setFilter(f);
    setTodos(applyFilter(allTodos, f));
  }

  function openCreate() {
    setEditor({ title: "", notes: "", assigneeId: "", dueDate: "" });
  }

  function openEdit(t: TodoRow) {
    setEditor({
      id: t.id,
      title: t.title,
      notes: t.notes || "",
      assigneeId: t.assignee_id || "",
      dueDate: t.due_date || "",
    });
  }

  function saveEditor() {
    if (!editor) return;
    start(async () => {
      if (editor.id) {
        const res = await updateTodoAction(editor.id, {
          title: editor.title,
          notes: editor.notes,
          assigneeId: editor.assigneeId || null,
          dueDate: editor.dueDate || null,
        });
        if (res.error) { toast(res.error, "error"); return; }
        toast("To-do updated.", "success");
      } else {
        const res = await createTodoAction({
          title: editor.title,
          notes: editor.notes,
          assigneeId: editor.assigneeId || null,
          dueDate: editor.dueDate || null,
        });
        if (res.error) { toast(res.error, "error"); return; }
        toast("To-do created.", "success");
      }
      setEditor(null);
      router.refresh();
      fetchTodos();
    });
  }

  function quickAdd() {
    const title = quick.trim();
    if (!title) return;
    start(async () => {
      const res = await createTodoAction({ title });
      if (res.error) { toast(res.error, "error"); return; }
      setQuick("");
      toast("To-do created.", "success");
      router.refresh();
      fetchTodos();
    });
  }

  function toggle(t: TodoRow) {
    start(async () => {
      const res = await toggleTodoAction(t.id);
      if (res.error) { toast(res.error, "error"); return; }
      router.refresh();
      fetchTodos();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    start(async () => {
      const res = await deleteTodoAction(deleteTarget.id);
      if (res.error) { toast(res.error, "error"); return; }
      setDeleteTarget(null);
      toast("To-do deleted.", "success");
      router.refresh();
      fetchTodos();
    });
  }

  const openCount = todos.filter((t) => !t.completed).length;

  return (
    <div className="space-y-3 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-brand-300" />
            To-Do List
          </h1>
          <p className="text-xs text-slate-400">Global task &amp; personal reminders</p>
        </div>
        <button onClick={openCreate} className="btn-primary !py-1.5 !px-3 text-xs">
          <Plus className="h-3.5 w-3.5" /> New Task
        </button>
      </div>

      {/* Quick add */}
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
        <CheckSquare className="h-4 w-4 text-slate-500 shrink-0" />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") quickAdd(); }}
          placeholder="Quick add a personal to-do…"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
        />
        <button onClick={quickAdd} disabled={pending || !quick.trim()} className="btn-ghost !px-2.5 !py-1 text-xs shrink-0 disabled:opacity-40">
          Add
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5 w-fit">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => changeFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                active ? "bg-brand-300 text-night-950" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500 text-sm gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <CheckSquare className="h-10 w-10 text-slate-700 mb-2" />
            <p className="text-xs">{filter === "all" ? "No to-dos yet." : "Nothing due in this period."}</p>
          </div>
        ) : (
          <>
            {openCount > 0 && (
              <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.01] text-[10px] text-slate-500">
                {openCount} open · {todos.length - openCount} done
              </div>
            )}
            {todos.map((t) => {
              const due = fmtDue(t.due_date);
              return (
                <div
                  key={t.id}
                  className={`group flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-b-0 transition-colors ${
                    t.completed ? "opacity-50" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      t.completed
                        ? "bg-brand-300 border-brand-300 text-night-950"
                        : "border-white/20 text-transparent hover:border-brand-300"
                    }`}
                    aria-label={t.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="text-sm text-left text-white font-medium hover:text-brand-300 transition-colors line-clamp-2"
                      >
                        <span className={t.completed ? "line-through text-slate-500" : ""}>{t.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5 shrink-0"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {t.notes && (
                      <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap line-clamp-2">{t.notes}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${
                        t.scope === "assigned" ? "bg-violet-400/10 text-violet-300" : "bg-white/[0.06] text-slate-400"
                      }`}>
                        {t.scope === "assigned" ? <UserCircle2 className="h-2.5 w-2.5" /> : <StickyNote className="h-2.5 w-2.5" />}
                        {t.scope === "assigned" ? (t.assignee_name || "Unassigned") : "Personal"}
                      </span>
                      {due && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-2.5 w-2.5" /> {due}
                        </span>
                      )}
                      <span className="text-slate-600">by {t.creator_name}</span>
                    </div>
                  </div>

                  <div className="mt-1 h-5 w-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-bold text-slate-300 shrink-0" title={t.creator_name}>
                    {initials(t.creator_name)}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "Edit To-Do" : "New To-Do"}>
        {editor && (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Title</label>
              <input
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                placeholder="What needs to be done?"
                className="input"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Notes (optional)</label>
              <textarea
                value={editor.notes}
                onChange={(e) => setEditor({ ...editor, notes: e.target.value })}
                placeholder="Additional details…"
                rows={3}
                className="input resize-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Assign to (leave blank for a personal note)</label>
              <select
                value={editor.assigneeId}
                onChange={(e) => setEditor({ ...editor, assigneeId: e.target.value })}
                className="input"
              >
                <option value="">— Personal —</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Due date</label>
              <input
                type="date"
                value={editor.dueDate}
                onChange={(e) => setEditor({ ...editor, dueDate: e.target.value })}
                className="input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditor(null)} className="btn-ghost">Cancel</button>
              <button
                onClick={saveEditor}
                disabled={pending || !editor.title.trim()}
                className="btn-primary disabled:opacity-40"
              >
                {editor.id ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete To-Do">
        <p className="text-xs text-slate-400 mb-4">
          Delete <strong className="text-white">{deleteTarget?.title}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Cancel</button>
          <button
            onClick={confirmDelete}
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
