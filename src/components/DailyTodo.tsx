"use client";

import { useState, useTransition, useMemo } from "react";
import { CalendarDays, Copy, Share2, Trash2, Edit3, Plus, Check, X, Clock3 } from "lucide-react";
import { upsertDailyLogAction, deleteDailyLogAction, type DailyLog } from "@/lib/actions/dailyLogs";
import { openWhatsApp } from "@/lib/whatsapp";
import { useToast } from "@/components/Toast";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function formatDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", weekday: "short" });
  } catch { return dateStr; }
}
function formatTodayBadge(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch { return dateStr; }
}
function buildWaMessage(log: DailyLog, userName: string): string {
  return [`📋 Daily Work Log — ${log.entry_date}`, `Name: ${userName}`, `Date: ${log.entry_date}`, ``, log.content].join("\n");
}

export default function DailyTodo({ initialLogs, userName }: { initialLogs: DailyLog[]; userName: string }) {
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [content, setContent] = useState<string>(() => {
    const found = initialLogs.find((l) => l.entry_date === todayISO());
    return found ? found.content : "";
  });
  const [editingId, setEditingId] = useState<string | null>(() => {
    const found = initialLogs.find((l) => l.entry_date === todayISO());
    return found ? found.id : null;
  });
  const [isPending, start] = useTransition();
  const { toast } = useToast();
  const [filterDate, setFilterDate] = useState<string>("");

  const today = todayISO();
  const isEditingPast = selectedDate !== today;
  const selectedLog = useMemo(() => logs.find((l) => l.entry_date === selectedDate) || null, [logs, selectedDate]);

  function resetToToday() {
    setSelectedDate(today);
    const found = logs.find((l) => l.entry_date === today);
    setContent(found ? found.content : "");
    setEditingId(found ? found.id : null);
  }

  function handleSave() {
    const txt = content.trim();
    if (!txt) { toast("Please enter what you worked on.", "error"); return; }
    start(async () => {
      const res = await upsertDailyLogAction(selectedDate, txt);
      if (!res.ok || !res.log) { toast(res.error || "Could not save.", "error"); return; }
      setLogs((prev) => {
        const exists = prev.find((p) => p.entry_date === selectedDate);
        if (exists) return prev.map((p) => (p.entry_date === selectedDate ? res.log! : p));
        return [res.log!, ...prev].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      });
      setEditingId(res.log.id);
      toast(selectedLog ? "Updated!" : "Saved!", "success");
    });
  }

  function handleEdit(log: DailyLog) {
    setSelectedDate(log.entry_date);
    setContent(log.content);
    setEditingId(log.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this entry?")) return;
    start(async () => {
      const res = await deleteDailyLogAction(id);
      if (!res.ok) { toast(res.error || "Could not delete.", "error"); return; }
      setLogs((prev) => prev.filter((p) => p.id !== id));
      // if deleted entry was being edited, reset to today
      if (editingId === id) resetToToday();
      toast("Deleted.", "success");
    });
  }

  function handleCopy(log: DailyLog) {
    const text = `${log.entry_date}\n${log.content}`;
    navigator.clipboard.writeText(text).then(() => toast("Copied!", "success")).catch(() => toast("Copy failed.", "error"));
  }
  function handleShare(log: DailyLog) {
    openWhatsApp(buildWaMessage(log, userName));
  }

  const filtered = useMemo(() => {
    if (!filterDate) return logs;
    return logs.filter((l) => l.entry_date === filterDate);
  }, [logs, filterDate]);

  const grouped = useMemo(() => {
    const m = new Map<string, DailyLog[]>();
    for (const l of filtered) {
      if (!m.has(l.entry_date)) m.set(l.entry_date, []);
      m.get(l.entry_date)!.push(l);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* Editor — auto today's date, no date picker */}
      <div className="rounded-2xl border border-white/10 bg-night-850 overflow-hidden shadow-sm">
        <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-8 w-8 rounded-xl bg-brand-300 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-night-950" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white leading-none">
                {isEditingPast ? "Edit Entry" : "Today's Entry"}
              </h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <Clock3 className="h-3 w-3" />
                {isEditingPast ? formatTodayBadge(selectedDate) : formatTodayBadge(today)}
                {isEditingPast && <span className="inline-flex items-center rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2 py-0.5 text-[10px] font-semibold ml-1">Editing past date</span>}
                {!isEditingPast && selectedLog && <span className="text-amber-300">• Editing existing</span>}
              </p>
            </div>
          </div>
          {isEditingPast && (
            <button type="button" onClick={resetToToday} className="sm:ml-auto text-xs font-medium text-brand-300 hover:text-brand-200 flex items-center gap-1 shrink-0">
              <X className="h-3 w-3" /> Back to Today
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300">What did you work on?</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder={"• 4 Post designs — Casa Infinity\n• 6 Fest Post — World Guru\n• 4 page Brochure — Sun Glow Energy\n• Client calls, revisions..."}
              className="w-full mt-2 rounded-xl border border-white/10 bg-night-900 px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-300/30 focus:border-brand-300/30 resize-y min-h-[120px]"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">Auto-saved for <span className="font-medium text-slate-300">{isEditingPast ? selectedDate : today}</span> • One note per date</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-300 text-night-950 px-5 py-2.5 text-sm font-semibold hover:bg-brand-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {selectedLog ? <><Check className="h-4 w-4" /> Update</> : <><Plus className="h-4 w-4" /> Save Today</>}
            </button>
            {content.trim().length > 0 && (
              <button
                type="button"
                onClick={() => { setContent(""); }}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 px-4 py-2.5 text-sm hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" /> Clear
              </button>
            )}
            <p className="hidden sm:block text-[11px] text-slate-500 ml-auto">Tip: Use <span className="text-slate-300 font-medium">Copy</span> or <span className="text-emerald-300 font-medium">Share to WhatsApp</span> from history below</p>
          </div>
        </div>
      </div>

      {/* Filter — only date filter remains */}
      <div className="rounded-xl border border-white/10 bg-night-850 px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarDays className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">Filter by date</span>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input !py-2 text-xs flex-1 min-w-0 max-w-[180px]"
          />
          {filterDate && (
            <button type="button" onClick={() => setFilterDate("")} className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white shrink-0">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <span className="text-xs font-medium text-slate-500 sm:ml-auto self-start sm:self-center">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          {filterDate ? ` for ${filterDate}` : " total"}
        </span>
      </div>

      {/* History */}
      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 sm:p-10 text-center">
          <div className="h-10 w-10 rounded-xl bg-brand-300/10 flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="h-5 w-5 text-brand-300" />
          </div>
          <p className="text-sm font-medium text-white">No work logs yet</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Write what you did today in the box above. It will appear here date-wise. Filter by date to find older entries.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, items]) => (
            <div key={date} className="rounded-2xl border border-white/10 bg-night-850 overflow-hidden">
              <div className="px-4 py-3 bg-white/[0.03] border-b border-white/[0.06] flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-300 shrink-0" />
                <p className="text-sm font-semibold text-white truncate">{formatDisplay(date)}</p>
                <span className="text-xs font-mono text-slate-500 hidden sm:inline">{date}</span>
                <span className="ml-auto text-[11px] font-medium text-slate-500">{items.length} {items.length === 1 ? "note" : "notes"}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.map((log) => (
                  <div key={log.id} className="p-4">
                    <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed break-words">{log.content}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <button type="button" onClick={() => handleCopy(log)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] transition-colors">
                        <Copy className="h-3.5 w-3.5" /> Copy
                      </button>
                      <button type="button" onClick={() => handleShare(log)} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-emerald-600 transition-colors shadow-sm">
                        <Share2 className="h-3.5 w-3.5" /> WhatsApp
                      </button>
                      <button type="button" onClick={() => handleEdit(log)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] transition-colors">
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button type="button" disabled={isPending} onClick={() => handleDelete(log.id)} className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors ml-auto">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
