"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, ChevronDown, Filter, PlayCircle, Send, Upload, CheckCircle2, History } from "lucide-react";
import type { Task } from "@/lib/types";
import type { QuickCounts } from "@/lib/taskFilters";
import { STATUS_META, STATUS_ORDER, PRIORITY_META } from "@/components/ui";

export type FilterKey = "client" | "project" | "stage" | "deadline" | "status" | "priority";

export interface FilterState {
  client: string;
  project: string;
  stage: string;
  deadline: string;
  status: string;
  priority: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface FilterOptions {
  client: SelectOption[];
  project: SelectOption[];
  stage: SelectOption[];
  deadline: SelectOption[];
  status: SelectOption[];
  priority: SelectOption[];
}

/**
 * Field-level configuration for the advanced filter.
 * Only the fields you provide are rendered and matched.
 */
export interface AdvancedFilterConfig<T> {
  client?: {
    id: (row: T) => string | null | undefined;
    label: (row: T) => string;
  };
  project?: {
    value: (row: T) => string | null | undefined;
  };
  stage?: {
    /** Candidate values that should match this row (stage holder + all assignees). */
    values: (row: T) => string[];
    /** Values to hide from the dropdown but still allow (e.g. "Unassigned"). */
    exclude?: string[];
  };
  deadline?: {
    date: (row: T) => string | null | undefined;
    completed: (row: T) => boolean;
  };
  status?: {
    value: (row: T) => string | null | undefined;
    label?: (value: string) => string;
    order?: string[];
  };
  priority?: {
    value: (row: T) => string | null | undefined;
  };
  /** Plain-text haystack used by the global search box. */
  searchText: (row: T) => string;
  /** Per-field dropdown labels (override the defaults, e.g. Stage → Assignee). */
  labels?: Partial<Record<FilterKey, string>>;
  /**
   * Server-supplied option lists. Used when the view is paginated: `rows` only
   * holds the current page, so deriving options from it would hide values that
   * exist on other pages. When provided for a field, it wins over the values
   * derived from `rows`.
   */
  facetOptions?: Partial<Pick<FilterOptions, "client" | "project" | "stage">>;
}

export interface AdvancedFilterApi<T> {
  filters: FilterState;
  options: FilterOptions;
  visible: FilterKey[];
  /** Effective per-field select labels, resolved from config + defaults. */
  labels: Record<FilterKey, string>;
  search: string;
  setSearch: (value: string) => void;
  setFilter: (key: FilterKey, value: string) => void;
  clearAll: () => void;
  /**
   * Adopt externally-computed values into local state WITHOUT touching the
   * URL. Used when the caller performs its own combined navigation (e.g. a
   * quick chip that switches tab + status atomically in one URL write) — the
   * local UI must match the URL the caller is about to push.
   */
  syncExternal: (nextFilters: FilterState, nextSearch: string) => void;
  /** Client-side predicate — feed the dataset through this to apply all filters. */
  matches: (row: T) => boolean;
  /** Any select filter is active (search excluded — it has its own clear button). */
  hasActive: boolean;
  /** True when a select filter OR the search box is active. */
  hasAnyFilter: boolean;
}

const ALL_KEYS: FilterKey[] = ["client", "project", "stage", "deadline", "status", "priority"];

const PARAM_BY_KEY: Record<FilterKey, string> = {
  client: "clientId",
  project: "project",
  stage: "stage",
  deadline: "deadline",
  status: "status",
  priority: "priority",
};

const DEFAULT_LABELS: Record<FilterKey, string> = {
  client: "Client",
  project: "Project",
  stage: "Stage",
  deadline: "Deadline",
  status: "Status",
  priority: "Priority",
};

const EMPTY_FILTERS: FilterState = {
  client: "",
  project: "",
  stage: "",
  deadline: "",
  status: "",
  priority: "",
};

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

const DEADLINE_OPTIONS: SelectOption[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "next_week", label: "Next Week" },
];

function equalFilters(a: FilterState, b: FilterState): boolean {
  return ALL_KEYS.every((k) => a[k] === b[k]);
}

/** ISO date part (YYYY-MM-DD) of a deadline, or null when unparseable. */
function isoDay(d?: string | null): string | null {
  if (!d) return null;
  const day = d.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function addDaysIso(day: string, n: number): string {
  const t = new Date(`${day}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

/** Monday of the week the given day falls in. */
function startOfWeekIso(day: string): string {
  const dow = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  return addDaysIso(day, -dow);
}

function deadlineMatches(
  date: string | null | undefined,
  completed: boolean,
  bucket: string
): boolean {
  const day = isoDay(date);
  if (!day) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (bucket === "overdue") return !completed && day < today;
  if (bucket === "today") return day === today;
  const weekStart = startOfWeekIso(today);
  const nextWeekStart = addDaysIso(weekStart, 7);
  if (bucket === "this_week") return day >= weekStart && day < nextWeekStart;
  if (bucket === "next_week") return day >= nextWeekStart && day < addDaysIso(nextWeekStart, 7);
  return false;
}

/**
 * Stage/person filter candidates for a pipeline task: the current holder
 * plus every assignee. Completed tasks expose a single "Completed" value,
 * unassigned ones "Unassigned" (hide it via config.stage.exclude).
 */
export function taskStageValues(t: Task): string[] {
  if (t.status === "completed") return ["Completed"];
  const seq = t.assignees || [];
  if (seq.length === 0) return ["Unassigned"];
  const idx = Math.min(t.current_step ?? 0, seq.length - 1);
  const current = seq[idx]?.name?.trim();
  const out: string[] = [];
  if (current) out.push(current);
  for (const a of seq) {
    const name = a?.name?.trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out.length ? out : ["Unassigned"];
}

const defaultStatusLabel = (v: string) => STATUS_META[v]?.label || v;

function statusToOptions(values: Set<string>, label: (v: string) => string, order?: string[]): SelectOption[] {
  const prio = order || STATUS_ORDER;
  const opts = [...values].map((value) => ({ value, label: label(value) }));
  const idx = (v: string) => {
    const i = prio.indexOf(v);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return opts.sort((a, b) => idx(a.value) - idx(b.value) || a.label.localeCompare(b.label));
}

function priorityToOptions(values: Set<string>): SelectOption[] {
  const opts = [...values].map((value) => ({ value, label: PRIORITY_META[value]?.label || value }));
  return opts.sort((a, b) => {
    const ia = PRIORITY_ORDER.indexOf(a.value);
    const ib = PRIORITY_ORDER.indexOf(b.value);
    return (ia === -1 ? PRIORITY_ORDER.length : ia) - (ib === -1 ? PRIORITY_ORDER.length : ib);
  });
}

/**
 * Filter controller shared by every list view. Owns the select/search state,
 * mirrors the selects into query params (?clientId=…&status=…) so views are
 * deep-linkable, and exposes a `matches` predicate for client-side filtering.
 * Only the provided config fields are shown and matched.
 */
export function useAdvancedFilters<T>(
  rows: T[],
  config: AdvancedFilterConfig<T>,
  opts?: { silentUrl?: boolean }
): AdvancedFilterApi<T> {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  // silentUrl: sync the URL via history.replaceState (no server re-render).
  // The Project Pipeline uses this — it fetches through a server action, so a
  // router navigation would only trigger a second, wasted full-board fetch.
  // Default (dashboards): router.replace, the server re-render does the fetch.
  const silent = opts?.silentUrl === true;

  const configRef = useRef(config);
  configRef.current = config;

  const visible = (ALL_KEYS.filter((k) => !!config[k]) as FilterKey[]);

  // Local filter/search state = instant UI. The URL is synced silently on
  // every change (deep-links/bookmarks keep working), but components react to
  // THIS state — never to a possibly-stale navigation snapshot. That kills two
  // bugs at once: laggy inputs waiting on slow server renders, and rapid
  // successive selections losing each other.
  const [filters, setFiltersState] = useState<FilterState>(() => {
    const next: FilterState = { ...EMPTY_FILTERS };
    for (const key of ALL_KEYS) {
      const raw = searchParams.get(PARAM_BY_KEY[key]);
      if (raw) next[key] = raw;
    }
    return next;
  });
  const [search, setSearchState] = useState<string>(() => searchParams.get("q") || "");
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const searchRef = useRef(search);
  searchRef.current = search;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // Back/forward buttons: re-adopt the URL state.
  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      const next: FilterState = { ...EMPTY_FILTERS };
      for (const key of ALL_KEYS) {
        const raw = sp.get(PARAM_BY_KEY[key]);
        if (raw) next[key] = raw;
      }
      const q = sp.get("q") || "";
      filtersRef.current = next;
      searchRef.current = q;
      setFiltersState(next);
      setSearchState(q);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Write the filter state into the URL. Filter values always come from the
  // explicit arguments (current by construction) — never from a navigation
  // snapshot that may still be catching up. Other params (page/tab/size/…)
  // are preserved; a new search/filter restarts at page 1.
  const pushUrl = useCallback((nextFilters: FilterState, nextSearch: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    for (const key of ALL_KEYS) sp.delete(PARAM_BY_KEY[key]);
    sp.delete("q");
    sp.delete("page");
    for (const key of ALL_KEYS) {
      const v = nextFilters[key];
      if (v) sp.set(PARAM_BY_KEY[key], v);
    }
    if (nextSearch) sp.set("q", nextSearch);
    const qs = sp.toString();
    const url = `${pathname}${qs ? `?${qs}` : ""}`;
    if (silent) window.history.replaceState(null, "", url);
    else router.replace(url, { scroll: false });
  }, [searchParams, pathname, router, silent]);

  const setSearch = useCallback((value: string) => {
    if (value === searchRef.current) return;
    searchRef.current = value;
    setSearchState(value);
    pushUrl(filtersRef.current, value);
  }, [pushUrl]);

  const setFilter = useCallback((key: FilterKey, value: string) => {
    const cur = filtersRef.current;
    if (cur[key] === value) return;
    const next = { ...cur, [key]: value };
    filtersRef.current = next;
    setFiltersState(next);
    pushUrl(next, searchRef.current);
  }, [pushUrl]);

  const clearAll = useCallback(() => {
    const next = { ...filtersRef.current };
    for (const k of visibleRef.current) next[k] = "";
    filtersRef.current = next;
    searchRef.current = "";
    setFiltersState(next);
    setSearchState("");
    pushUrl(next, "");
  }, [pushUrl]);

  const syncExternal = useCallback((nextFilters: FilterState, nextSearch: string) => {
    const full: FilterState = { ...EMPTY_FILTERS, ...nextFilters };
    filtersRef.current = full;
    searchRef.current = nextSearch;
    setFiltersState(full);
    setSearchState(nextSearch);
  }, []);

  const labels: Record<FilterKey, string> = { ...DEFAULT_LABELS, ...config.labels };

  const options = useMemo<FilterOptions>(() => {
    const cfg = configRef.current;
    const client = new Map<string, string>();
    const project = new Set<string>();
    const stage = new Set<string>();
    const status = new Set<string>();
    const priority = new Set<string>();
    const stageExclude = new Set(cfg.stage?.exclude || []);
    const statusLabel = cfg.status?.label || defaultStatusLabel;

    for (const row of rows) {
      if (cfg.client) {
        const id = cfg.client.id(row);
        if (id) {
          const label = cfg.client.label(row).trim();
          if (label && !client.has(id)) client.set(id, label);
        }
      }
      if (cfg.project) {
        const v = cfg.project.value(row)?.trim();
        if (v) project.add(v);
      }
      if (cfg.stage) {
        for (const v of cfg.stage.values(row)) {
          const s = v.trim();
          if (s && !stageExclude.has(s)) stage.add(s);
        }
      }
      if (cfg.status) {
        const v = cfg.status.value(row);
        if (v) status.add(v);
      }
      if (cfg.priority) {
        const v = cfg.priority.value(row);
        if (v) priority.add(v);
      }
    }

    // Paginated views pass server-computed facets so dropdowns keep listing
    // every option, not just the ones present on the current page.
    const facets = cfg.facetOptions || {};
    const clientOpts = facets.client || [...client.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
    const projectOpts = facets.project || [...project].map((value) => ({ value, label: value })).sort((a, b) => a.label.localeCompare(b.label));
    // `exclude` still applies to server facets — it is about hiding a value from
    // the picker, not about how the option list was produced.
    const stageOpts = (facets.stage || [...stage].map((value) => ({ value, label: value })))
      .filter((o) => !stageExclude.has(o.value))
      .sort((a, b) => a.label.localeCompare(b.label));

    return {
      client: clientOpts,
      project: projectOpts,
      stage: stageOpts,
      deadline: cfg.deadline ? DEADLINE_OPTIONS : [],
      // Status & priority are closed enums: ALWAYS list every canonical value,
      // so the option exists even when no row on the current page carries it
      // (e.g. "Ready to Start" tasks sitting on page 2). Row-derived extras
      // (legacy/custom values) are appended after the canonical order.
      status: cfg.status
        ? statusToOptions(
            new Set([...status, ...(cfg.status.order || STATUS_ORDER), ...Object.keys(STATUS_META)]),
            statusLabel,
            cfg.status?.order
          )
        : [],
      priority: cfg.priority
        ? priorityToOptions(new Set([...priority, ...PRIORITY_ORDER, ...Object.keys(PRIORITY_META)]))
        : [],
    };
  }, [rows, configRef.current.facetOptions]);

  const matches = useCallback(
    (row: T): boolean => {
      const cfg = configRef.current;
      if (filters.client && cfg.client && String(cfg.client.id(row) || "") !== filters.client) return false;
      if (filters.project && cfg.project && String(cfg.project.value(row) || "").trim() !== filters.project) return false;
      if (filters.stage && cfg.stage && !cfg.stage.values(row).some((v) => v.trim() === filters.stage)) return false;
      if (filters.deadline && cfg.deadline && !deadlineMatches(cfg.deadline.date(row), cfg.deadline.completed(row), filters.deadline)) return false;
      if (filters.status && cfg.status && String(cfg.status.value(row) || "") !== filters.status) return false;
      if (filters.priority && cfg.priority && String(cfg.priority.value(row) || "") !== filters.priority) return false;
      const q = search.trim().toLowerCase();
      if (q && !cfg.searchText(row).toLowerCase().includes(q)) return false;
      return true;
    },
    [filters, search]
  );

  const hasActive = visible.some((k) => filters[k] !== "");

  return {
    filters,
    options,
    visible,
    labels,
    search,
    setSearch,
    setFilter,
    clearAll,
    syncExternal,
    matches,
    hasActive,
    hasAnyFilter: hasActive || search.trim().length > 0,
  };
}

function GlobalSearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Local draft so typing stays instant (no lag): the server fetch only fires
  // once per pause (debounced), instead of on every keystroke.
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when the URL value changes elsewhere (clear-all, back/forward).
  useEffect(() => {
    setDraft(value);
  }, [value]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const commit = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (v !== value) onChange(v);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="text"
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(v), 450);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(draft);
          if (e.key === "Escape" && draft) {
            setDraft("");
            commit("");
          }
        }}
        onBlur={() => commit(draft)}
        placeholder="Search client, project, task, stage, status, priority, deadline…"
        aria-label="Search across the current list"
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-8 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-brand-300/50 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            commit("");
          }}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export type QuickKind = "active" | "awaiting" | "upload" | "completed" | "history";

/**
 * One-tap status shortcuts shared by the pipeline and every dashboard:
 * Active / Awaiting Review / Upload Done / Completed / History.
 * Counts are server-computed across the WHOLE dataset (never just the loaded
 * page), so every number is exact for every role.
 */
export function QuickFilterChips({
  counts,
  tab,
  status,
  onSelect,
}: {
  counts: QuickCounts;
  tab: "active" | "history";
  status: string;
  onSelect: (kind: QuickKind) => void;
}) {
  const chips: { kind: QuickKind; label: string; count: number; selected: boolean; Icon: typeof PlayCircle }[] = [
    { kind: "active", label: "Active", count: counts.active, selected: tab === "active" && !status, Icon: PlayCircle },
    { kind: "awaiting", label: "Awaiting Review", count: counts.awaiting, selected: tab === "active" && status === "submitted", Icon: Send },
    { kind: "upload", label: "Upload Done", count: counts.uploadDone, selected: tab === "active" && status === "upload_done", Icon: Upload },
    { kind: "completed", label: "Completed", count: counts.completed, selected: tab === "history" && status === "completed", Icon: CheckCircle2 },
    { kind: "history", label: "History", count: counts.history, selected: tab === "history" && !status, Icon: History },
  ];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {chips.map(({ kind, label, count, selected, Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={() => onSelect(kind)}
          aria-pressed={selected}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
            selected
              ? "bg-brand-300 text-night-950"
              : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
          <span className={`text-[11px] font-bold ${selected ? "text-night-900/70" : "text-slate-500"}`}>{count}</span>
        </button>
      ))}
    </div>
  );
}

function FilterSelect({  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-700 bg-gray-800 py-2 pl-3 pr-8 text-sm text-white transition-colors focus:border-brand-300/50 focus:outline-none focus:ring-2 focus:ring-brand-300/40"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

/**
 * Renders the universal filter bar: inline on desktop (md+) and a Filter button
 * that opens a bottom-sheet modal on mobile (<768px). Mobile dropdowns are
 * stacked vertically w-full for easy touch and sync to URL params immediately
 * via api.setFilter / api.clearAll, preserving deep-linking exactly like desktop.
 */
export function AdvancedFilterBar<T>({ api }: { api: AdvancedFilterApi<T> }) {
  const shows = (k: FilterKey) => api.visible.includes(k);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const activeCount = api.visible.filter((k) => api.filters[k] !== "").length;

  // Lock body scroll + Escape to close on mobile modal
  useEffect(() => {
    if (!isMobileFilterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMobileFilterOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isMobileFilterOpen]);

  return (
    <>
      {/* Desktop View (md+): inline horizontally aligned dropdowns — keep unchanged */}
      <div className="hidden md:flex items-center gap-2">
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-400">
          <Filter className="h-3.5 w-3.5" /> Filter:
        </span>

        {shows("client") && (
          <div className="shrink-0 min-w-[130px] flex-1 max-w-[180px]">
            <FilterSelect
              value={api.filters.client}
              onChange={(v) => api.setFilter("client", v)}
              options={api.options.client}
              placeholder={api.labels.client}
            />
          </div>
        )}

        {shows("project") && (
          <div className="shrink-0 min-w-[130px] flex-1 max-w-[180px]">
            <FilterSelect
              value={api.filters.project}
              onChange={(v) => api.setFilter("project", v)}
              options={api.options.project}
              placeholder={api.labels.project}
            />
          </div>
        )}

        {shows("stage") && (
          <div className="shrink-0 min-w-[130px] flex-1 max-w-[180px]">
            <FilterSelect
              value={api.filters.stage}
              onChange={(v) => api.setFilter("stage", v)}
              options={api.options.stage}
              placeholder={api.labels.stage}
            />
          </div>
        )}

        {shows("deadline") && (
          <div className="shrink-0 min-w-[120px] w-[150px]">
            <FilterSelect
              value={api.filters.deadline}
              onChange={(v) => api.setFilter("deadline", v)}
              options={api.options.deadline}
              placeholder={api.labels.deadline}
            />
          </div>
        )}

        {shows("status") && (
          <div className="shrink-0 min-w-[120px] w-[160px]">
            <FilterSelect
              value={api.filters.status}
              onChange={(v) => api.setFilter("status", v)}
              options={api.options.status}
              placeholder={api.labels.status}
            />
          </div>
        )}

        {shows("priority") && (
          <div className="shrink-0 min-w-[120px] w-[150px]">
            <FilterSelect
              value={api.filters.priority}
              onChange={(v) => api.setFilter("priority", v)}
              options={api.options.priority}
              placeholder={api.labels.priority}
            />
          </div>
        )}

        {api.hasActive && (
          <button
            type="button"
            onClick={api.clearAll}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}

        <div className="shrink-0 min-w-[220px] flex-1 max-w-sm ml-auto">
          <GlobalSearchInput value={api.search} onChange={api.setSearch} />
        </div>
      </div>

      {/* Mobile View (<768px): Search + Filters button; dropdowns hidden until modal */}
      <div className="flex md:hidden items-center gap-2">
        <div className="flex-1 min-w-0">
          <GlobalSearchInput value={api.search} onChange={api.setSearch} />
        </div>
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
          aria-label="Open filters"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-300 px-1.5 text-[11px] font-bold text-night-950">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Modal — Bottom Drawer (slides up from bottom) */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsMobileFilterOpen(false)} aria-hidden />
          <div className="relative flex w-full max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-night-850 shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-[slideUp_0.28s_cubic-bezier(0.32,0.72,0,1)]">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Filter className="h-4 w-4 text-brand-300" /> Filters
                {activeCount > 0 && <span className="badge bg-brand-300/15 text-brand-300">{activeCount} active</span>}
              </h3>
              {/* Top X hidden on mobile — only bottom FAB */}
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15 ring-1 ring-white/10 shadow-sm transition-colors"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="flex flex-col gap-4 w-full">
                {shows("client") && (
                  <div className="w-full">
                    <label className="label">{api.labels.client}</label>
                    <FilterSelect value={api.filters.client} onChange={(v) => api.setFilter("client", v)} options={api.options.client} placeholder={api.labels.client} />
                  </div>
                )}
                {shows("project") && (
                  <div className="w-full">
                    <label className="label">{api.labels.project}</label>
                    <FilterSelect value={api.filters.project} onChange={(v) => api.setFilter("project", v)} options={api.options.project} placeholder={api.labels.project} />
                  </div>
                )}
                {shows("stage") && (
                  <div className="w-full">
                    <label className="label">{api.labels.stage}</label>
                    <FilterSelect value={api.filters.stage} onChange={(v) => api.setFilter("stage", v)} options={api.options.stage} placeholder={api.labels.stage} />
                  </div>
                )}
                {shows("deadline") && (
                  <div className="w-full">
                    <label className="label">{api.labels.deadline}</label>
                    <FilterSelect value={api.filters.deadline} onChange={(v) => api.setFilter("deadline", v)} options={api.options.deadline} placeholder={api.labels.deadline} />
                  </div>
                )}
                {shows("status") && (
                  <div className="w-full">
                    <label className="label">{api.labels.status}</label>
                    <FilterSelect value={api.filters.status} onChange={(v) => api.setFilter("status", v)} options={api.options.status} placeholder={api.labels.status} />
                  </div>
                )}
                {shows("priority") && (
                  <div className="w-full">
                    <label className="label">{api.labels.priority}</label>
                    <FilterSelect value={api.filters.priority} onChange={(v) => api.setFilter("priority", v)} options={api.options.priority} placeholder={api.labels.priority} />
                  </div>
                )}
                {api.visible.length === 0 && <p className="text-xs text-slate-500">No filters available for this view.</p>}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2 px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
              {api.hasActive && (
                <button type="button" onClick={() => { api.clearAll(); }} className="btn-ghost flex-1">
                  <X className="h-3.5 w-3.5" /> Clear All
                </button>
              )}
              <button type="button" onClick={() => setIsMobileFilterOpen(false)} className="btn-primary flex-1">
                Apply Filters
              </button>
            </div>
          </div>

          {/* Mobile close FAB — lifted above bottom nav, high contrast */}
          <button
            onClick={() => setIsMobileFilterOpen(false)}
            aria-label="Close filters"
            className="fixed bottom-24 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gray-800 text-white shadow-2xl shadow-black/60 border border-gray-600 active:scale-95 transition-transform md:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </>
  );
}