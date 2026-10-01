"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZES, type PageSize } from "@/lib/pagination";

export { PAGE_SIZES, clampPageSize } from "@/lib/pagination";
export type { PageSize } from "@/lib/pagination";

/**
 * Compact pager: "Showing X–Y of Z" + a 25/50/100 page-size picker.
 *
 * Pagination here is always driven by the server (LIMIT/OFFSET), so changing
 * the page only transfers the rows for that page — never the whole list.
 */
export default function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  busy = false,
  itemLabel = "rows",
}: {
  page: number;
  pageSize: PageSize;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
  busy?: boolean;
  itemLabel?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.06]">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span>
          Showing <span className="text-white font-medium">{from}</span>–
          <span className="text-white font-medium">{to}</span> of{" "}
          <span className="text-white font-medium">{total}</span> {itemLabel}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value) as PageSize)}
            aria-label={`${itemLabel} per page`}
            className="rounded-lg border border-white/10 bg-white/[0.06] text-white text-xs px-2 py-1 outline-none focus:border-brand-300/50"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={busy || page <= 1}
          aria-label="Previous page"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <span className="text-xs text-slate-400 px-1 tabular-nums">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={busy || page >= totalPages}
          aria-label="Next page"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}