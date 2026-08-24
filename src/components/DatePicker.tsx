"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayKey() {
  return toIso(new Date());
}

export function DatePicker({
  name,
  value,
  onChange,
  required,
  placeholder = "Select date…",
}: {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(value || "");
  const now = new Date();
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const formatted = internal
    ? new Date(internal + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "long", day: "numeric" })
    : "";

  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  function prev() {
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  }
  function next() {
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  }
  function pick(day: number) {
    const v = toIso(new Date(view.y, view.m, day));
    setInternal(v);
    onChange?.(v);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <input type="hidden" name={name} value={internal} />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`input text-left cursor-pointer ${internal ? "" : "text-slate-500"}`}
        >
          {formatted || placeholder}
        </button>
        <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        {internal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setInternal("");
              onChange?.("");
              setOpen(false);
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-slate-500"
            title="Clear date"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 rounded-2xl border border-white/10 bg-night-850 p-3 shadow-lg shadow-black/40">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prev} className="p-1 rounded-lg hover:bg-white/10 text-slate-500">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold text-white">
              {new Date(view.y, view.m, 1).toLocaleDateString([], { month: "long", year: "numeric" })}
            </p>
            <button type="button" onClick={next} className="p-1 rounded-lg hover:bg-white/10 text-slate-500">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
            {WEEKDAYS.map((d) => (
              <span key={d} className="text-[10px] font-medium text-slate-500 py-1">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = toIso(new Date(view.y, view.m, day));
              const isToday = iso === todayKey();
              const isSelected = iso === internal;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-brand-300 text-night-950 shadow-sm shadow-brand-300/25"
                      : isToday
                      ? "bg-brand-300/10 text-brand-300"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <span className="text-[10px] text-slate-500">
              {required && !internal ? "Required" : internal ? "Selected" : "Pick a date"}
            </span>
            {internal && (
              <button
                type="button"
                onClick={() => pick(Math.min(dayOf(internal), daysInMonth))}
                disabled={!internal}
                className="text-[10px] font-semibold text-brand-300 hover:text-brand-200"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function dayOf(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.getDate();
}