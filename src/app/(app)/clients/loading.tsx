export default function ClientsLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-7 w-32 rounded bg-white/[0.08] animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-xl bg-white/[0.06] animate-pulse" />
          <div className="h-9 w-28 rounded-xl bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-full sm:max-w-xs rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="h-6 w-16 rounded-full bg-white/[0.06] animate-pulse" />
      </div>

      {/* Client cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2.5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
              <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse" />
              <div className="ml-auto flex gap-1.5">
                <div className="h-5 w-12 rounded-full bg-white/[0.04] animate-pulse" />
                <div className="h-5 w-10 rounded-full bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-8 rounded-lg bg-white/[0.04] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
    </div>
  );
}
