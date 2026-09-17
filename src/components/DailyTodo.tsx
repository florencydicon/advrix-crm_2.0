"use client";

import { useState, useTransition, useMemo } from "react";
import { CalendarDays, Copy, Share2, Trash2, Edit3, Plus, Check, X } from "lucide-react";
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
function buildWaMessage(log: DailyLog, userName: string): string {
  const lines = [
    `📋 Daily Work Log — ${log.entry_date}`,
    `Name: ${userName}`,
    `Date: ${log.entry_date}`,
    ``,
    log.content,
  ];
  return lines.join("\n");
}

export default function DailyTodo({ initialLogs, userName }: { initialLogs: DailyLog[]; userName: string }) {
  const [logs, setLogs] = useState<DailyLog[]>(initialLogs);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [content, setContent] = useState<string>(() => {
    const found = initialLogs.find((l) => l.entry_date === todayISO());
    return found ? found.content : "";
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, start] = useTransition();
  const { toast } = useToast();
  const [filterDate, setFilterDate] = useState<string>("");

  const selectedLog = useMemo(() => logs.find((l) => l.entry_date === selectedDate) || null, [logs, selectedDate]);

  // When date changes, preload content
  function onDateChange(v: string) {
    setSelectedDate(v);
    const found = logs.find((l) => l.entry_date === v);
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
      toast("Saved!", "success");
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this log?")) return;
    start(async () => {
      const res = await deleteDailyLogAction(id);
      if (!res.ok) { toast(res.error || "Could not delete.", "error"); return; }
      setLogs((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) { setEditingId(null); setContent(""); }
      toast("Deleted.", "success");
    });
  }

  function handleCopy(log: DailyLog) {
    const text = `${log.entry_date}\n${log.content}`;
    navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard!", "success")).catch(() => toast("Copy failed.", "error"));
  }

  function handleShare(log: DailyLog) {
    const msg = buildWaMessage(log, userName);
    openWhatsApp(msg);
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
    <div className="space-y-4">
      {/* Editor */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-brand-300" />
          <h2 className="text-sm font-semibold text-white">Daily Work Log</h2>
          <span className="ml-auto text-[11px] text-slate-500">One note per date — date-wise history below</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          <div>
            <label className="text-[11px] font-medium text-slate-400">Date</label>
            <input type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} className="input !py-2 text-sm mt-1 w-full" />
            {selectedLog && <p className="text-[11px] text-amber-300 mt-1">Editing existing entry for this date</p>}
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400">What did you work on today?</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder="e.g. Completed 4 posts for Casa Infinity, edited reel for Pelican Nest, client call..." className="w-full mt-1 rounded-xl border border-white/10 bg-night-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-300" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button type="button" disabled={isPending} onClick={handleSave} className="btn-primary !py-2 text-xs disabled:opacity-50">
            {selectedLog ? <><Check className="h-3.5 w-3.5" /> Update</> : <><Plus className="h-3.5 w-3.5" /> Save</>}
          </button>
          {selectedLog && (
            <button type="button" disabled={isPending} onClick={() => { setContent(""); setEditingId(null); }} className="btn-ghost !py-2 text-xs">Clear</button>
          )}
          <span className="ml-auto text-[11px] text-slate-500 hidden sm:inline">Tip: Copy or Share any past entry to WhatsApp (fixed number)</span>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">Filter by date:</span>
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input !py-1.5 text-xs w-[150px]" />
          {filterDate && (
            <button type="button" onClick={() => setFilterDate("")} className="btn-ghost !py-1 !px-2 text-[11px]"><X className="h-3 w-3" /> Clear</button>
          )}
        </div>
        <span className="ml-auto text-xs text-slate-500">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</span>
      </div>

      {/* Date-wise list */}
      {grouped.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-400">No work logs yet.</p>
          <p className="text-xs text-slate-500 mt-1">Add your first entry above — pick a date and write what you did.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, items]) => (
            <div key={date} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-white/[0.04] border-b border-white/[0.06] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-300" />
                <p className="text-sm font-semibold text-white">{formatDisplay(date)}</p>
                <span className="text-[11px] text-slate-500">{date}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {items.map((log) => (
                  <div key={log.id} className="px-4 py-3">
                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{log.content}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <button type="button" onClick={() => handleCopy(log)} className="btn-ghost !py-1 !px-2.5 text-[11px]"><Copy className="h-3 w-3" /> Copy</button>
                      <button type="button" onClick={() => handleShare(log)} className="btn-ghost !py-1 !px-2.5 text-[11px] text-emerald-300"><Share2 className="h-3 w-3" /> Share to WhatsApp</button>
                      <button type="button" onClick={() => { setSelectedDate(log.entry_date); setContent(log.content); setEditingId(log.id); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="btn-ghost !py-1 !px-2.5 text-[11px]"><Edit3 className="h-3 w-3" /> Edit</button>
                      <button type="button" disabled={isPending} onClick={() => handleDelete(log.id)} className="btn-ghost !py-1 !px-2.5 text-[11px] !text-rose-400 ml-auto"><Trash2 className="h-3 w-3" /> Delete</button>
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
