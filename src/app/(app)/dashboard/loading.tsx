export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6 animate-fade-in">
      {/* Greeting banner skeleton */}
      <div className="rounded-2xl h-28 bg-white/[0.04] animate-pulse" />

      {/* 3 metric cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-3 md:p-4 space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-16 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-7 w-10 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-12 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Search bar skeleton */}
      <div className="h-10 rounded-xl bg-white/[0.04] animate-pulse" />

      {/* Task list cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card overflow-hidden" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-10 w-10 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-1/3 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
