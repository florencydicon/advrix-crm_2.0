"use client";

import { useState, useMemo } from "react";
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

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  search?: string;
  searchPlaceholder?: string;
  filterTabs?: FilterTab[];
  activeFilter?: string;
  onSearch?: (q: string) => void;
  onPageChange?: (page: number) => void;
  onFilterChange?: (key: string) => void;
  onSort?: (key: string, dir: "asc" | "desc") => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  actions?: React.ReactNode;
  loading?: boolean;
}

export default function DataTable<T>({
  columns,
  data,
  total = 0,
  page = 1,
  pageSize = 20,
  totalPages = 1,
  search = "",
  searchPlaceholder = "Search…",
  filterTabs,
  activeFilter = "",
  onSearch,
  onPageChange,
  onFilterChange,
  onSort,
  emptyTitle = "No results",
  emptySubtitle,
  actions,
  loading = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchDraft, setSearchDraft] = useState(search);

  const handleSort = (key: string) => {
    if (!onSort) return;
    let dir: "asc" | "desc" = "asc";
    if (sortKey === key) {
      dir = sortDir === "asc" ? "desc" : "asc";
    }
    setSortKey(key);
    setSortDir(dir);
    onSort(key, dir);
  };

  const handleSearchSubmit = () => {
    onSearch?.(searchDraft);
  };

  return (
    <div className="space-y-4">
      {(onSearch || filterTabs || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {onSearch && (
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                placeholder={searchPlaceholder}
                className="input !pl-9 !py-1.5 text-sm"
              />
            </div>
          )}
          {filterTabs && filterTabs.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onFilterChange?.(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/6" />
                  <div className="h-4 bg-slate-200 rounded w-1/6" />
                  <div className="h-4 bg-slate-200 rounded w-1/6 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <p className="font-medium text-slate-700">{emptyTitle}</p>
            {emptySubtitle && <p className="text-sm text-slate-400 mt-1">{emptySubtitle}</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/60">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${
                        col.sortable ? "cursor-pointer hover:text-slate-700 select-none" : ""
                      } ${col.className || ""}`}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && sortKey === col.key && (
                          sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className={`px-5 py-3 ${col.className || ""}`}>
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
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/30">
            <p className="text-xs text-slate-500">
              {total} result{total === 1 ? "" : "s"} · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange?.(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
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
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={page >= totalPages}
                onClick={() => onPageChange?.(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
