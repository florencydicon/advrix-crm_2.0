export default function LeadsLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="h-7 w-28 rounded bg-white/[0.08] animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-xl bg-white/[0.06] animate-pulse" />
          <div className="h-9 w-16 rounded-xl bg-white/[0.06] animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-3 md:p-4 space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-20 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-7 w-14 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Search + filter tabs */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-full sm:max-w-xs rounded-xl bg-white/[0.04] animate-pulse" />
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-full bg-white/[0.04] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="card overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06]">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-white/[0.06] animate-pulse" style={{ width: i === 0 ? "15%" : i === 6 ? "8%" : "12%", animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04]" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-4 w-[15%] rounded bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-[12%] rounded bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-[10%] rounded bg-white/[0.04] animate-pulse" />
            <div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-[10%] rounded bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-[12%] rounded bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-[8%] rounded bg-white/[0.04] animate-pulse ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
