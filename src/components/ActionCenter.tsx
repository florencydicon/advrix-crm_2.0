"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, Folder, FolderKanban, CalendarDays, AlertTriangle,
  FileCheck, UserCheck, ListTodo, Filter,
} from "lucide-react";

type ActionItem = {
  id: string;
  type: "project" | "task" | "leave" | "bottleneck";
  title: string;
  subtitle: string;
  href: string;
};

const TYPE_META: Record<
  ActionItem["type"],
  { label: string; icon: React.ReactNode; dot: string; countBg: string }
> = {
  project:   { label: "Pending Approval",  icon: <FileCheck    className="h-3.5 w-3.5 text-amber-400" />,  dot: "bg-amber-400",  countBg: "bg-amber-400/10 border-amber-400/20 text-amber-300" },
  task:      { label: "Submitted Tasks",   icon: <ListTodo     className="h-3.5 w-3.5 text-sky-400" />,    dot: "bg-sky-400",    countBg: "bg-sky-400/10 border-sky-400/20 text-sky-300" },
  leave:     { label: "Pending Leaves",    icon: <UserCheck    className="h-3.5 w-3.5 text-violet-400" />, dot: "bg-violet-400", countBg: "bg-violet-400/10 border-violet-400/20 text-violet-300" },
  bottleneck:{ label: "Bottlenecks",       icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />,  dot: "bg-rose-400",   countBg: "bg-rose-400/10 border-rose-400/20 text-rose-300" },
};

const FILTER_TABS: { key: ActionItem["type"] | "all"; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "project",   label: "Projects" },
  { key: "task",      label: "Tasks" },
  { key: "leave",     label: "Leaves" },
  { key: "bottleneck",label: "Bottlenecks" },
];

export default function ActionCenter({ items }: { items: ActionItem[] }) {
  const [filter, setFilter] = useState<ActionItem["type"] | "all">("all");

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);

  return (
    <>
      {/* summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 md:px-5 pt-3">
        {(Object.keys(TYPE_META) as ActionItem["type"][]).map((key) => {
          const meta = TYPE_META[key];
          const count = items.filter((i) => i.type === key).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={`rounded-xl border p-2.5 flex items-center gap-2 transition-all ${
                filter === key ? "ring-1 ring-white/30 " : ""
              } ${meta.countBg}`}
            >
              {meta.icon}
              <div className="text-left">
                <p className="text-[10px] md:text-[11px] opacity-80 leading-tight">{meta.label}</p>
                <p className="text-base font-bold text-white">{count}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* filter tabs */}
      <div className="flex items-center gap-1.5 px-4 md:px-5 pt-3">
        <Filter className="h-3 w-3 text-slate-500 shrink-0" />
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              filter === tab.key
                ? "bg-brand-300 text-night-950"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* item list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
          <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
            <Folder className="h-5 w-5 text-slate-500" />
          </div>
          <p className="text-sm text-slate-400">Nothing here.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06] max-h-72 overflow-y-auto mt-2">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 hover:bg-white/[0.04] transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${TYPE_META[item.type].dot}`} />
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                </div>
                <p className="text-xs text-slate-500 truncate ml-3.5">{item.subtitle}</p>
              </div>
              <span className="badge text-[10px] shrink-0 whitespace-nowrap capitalize bg-white/[0.06] text-slate-400 border-white/10">
                {item.type}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="px-4 md:px-5 py-3 border-t border-white/[0.06] flex gap-2">
        <Link href="/projects" className="btn-secondary flex-1 justify-center text-xs">
          <FolderKanban className="h-3.5 w-3.5" /> Projects
        </Link>
        <Link href="/attendance" className="btn-secondary flex-1 justify-center text-xs">
          <CalendarDays className="h-3.5 w-3.5" /> Attendance
        </Link>
      </div>
    </>
  );
}
