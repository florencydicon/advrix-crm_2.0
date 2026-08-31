"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2, Check, ExternalLink } from "lucide-react";
import type { PortfolioClient } from "@/lib/actions/masterboard";
import { createClientShareAction } from "@/lib/actions/masterboard";
import { formatClientName } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

export default function ClientPortfolioHub({
  clients,
  canShare,
}: {
  clients: PortfolioClient[];
  canShare: boolean;
}) {
  const [genId, setGenId] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function generate(clientId: string) {
    setGenId(clientId);
    startTransition(async () => {
      const res = await createClientShareAction(clientId);
      setGenId(null);
      if (res.ok && res.url) {
        setUrls((prev) => ({ ...prev, [clientId]: res.url as string }));
      }
    });
  }

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 border-l border-white/[0.06] bg-night-900/40">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Client Portfolio
        </h3>
        <p className="text-[10px] text-slate-600 mt-0.5">{clients.length} active</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {clients.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
          >
            <div className="flex items-center gap-2.5">
                <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${avatarClass(c.name)}`}>
                  {initials(c.company || c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{formatClientName(c.company, c.name)}</p>
                <p className="text-[10px] text-slate-600 truncate">
                  {c.active_projects} active · {c.total_projects} total
                </p>
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-300 transition-all"
                  style={{ width: `${c.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 tabular-nums">{c.progress}%</span>
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
              {c.completed_tasks}/{c.total_tasks} tasks done
            </p>

            {canShare && (
              <div className="mt-2">
                {urls[c.id] ? (
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <a
                      href={urls[c.id]}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-300 truncate hover:underline flex items-center gap-1"
                    >
                      Shared link <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={() => generate(c.id)}
                    disabled={pending && genId === c.id}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {pending && genId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    Share client dashboard
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {clients.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-8">No clients yet</p>
        )}
      </div>
    </aside>
  );
}
