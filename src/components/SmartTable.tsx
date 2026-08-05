"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { ChevronUp, ChevronDown, Search, ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render: (item: T) => React.ReactNode;
}

export interface FilterTab {
  key: string;
  label: string;
  count?: number;
}

interface SmartTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchPlaceholder?: string;
  filterTabs?: FilterTab[];
  filterParam?: string;
  searchParam?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  actions?: React.ReactNode;
  basePath: string;
}

export default function SmartTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  totalPages,
  searchPlaceholder = "Search…",
  filterTabs,
  filterParam = "filter",
  searchParam = "search",
  emptyTitle = "No results",
  emptySubtitle,
  actions,
  basePath,
}: SmartTableProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(searchParams.get(searchParam) || "");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const activeFilter = searchParams.get(filterParam) || "";

  const navigate = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "") {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      if (!params.page) {
        newParams.delete("page");
      }
      router.push(`${basePath}?${newParams.toString()}`);
    },
    [router, searchParams, basePath]
  );

  const handleFilter = (key: string) => {
    navigate({ [filterParam]: key === activeFilter ? null : key });
  };

  const handleSearch = () => {
    navigate({ [searchParam]: searchDraft || null });
  };

  const handlePage = (p: number) => {
    navigate({ page: String(p) });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={searchPlaceholder}
            className="input !pl-8 !py-1.5 text-xs"
          />
        </div>
        {filterTabs && filterTabs.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleFilter(tab.key)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeFilter === tab.key
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 opacity-70">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
        )}
        {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
      </div>

      <div className="card overflow-hidden">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium text-slate-600">{emptyTitle}</p>
            {emptySubtitle && <p className="text-xs text-slate-400 mt-0.5">{emptySubtitle}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${
                        col.sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""
                      } ${col.className || ""}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-2 ${col.className || ""}`}>
                        {col.render(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50/30">
            <p className="text-[11px] text-slate-500">
              {total} items · Page {page}/{totalPages}
            </p>
            <div className="flex items-center gap-0.5">
              <button
                className="p-1 rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => handlePage(page - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePage(pageNum)}
                    className={`w-7 h-7 rounded text-[11px] font-medium transition-colors ${
                      page === pageNum
                        ? "bg-brand-600 text-white"
                        : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="p-1 rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page >= totalPages}
                onClick={() => handlePage(page + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
