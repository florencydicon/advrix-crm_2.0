export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-7 w-36 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-56 rounded bg-white/[0.04] animate-pulse" />
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-3 w-20 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-7 w-14 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* 2-column section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dept completion card */}
        <div className="card p-5 space-y-4">
          <div className="h-4 w-44 rounded bg-white/[0.08] animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex justify-between">
                  <div className="h-3 w-20 rounded bg-white/[0.06] animate-pulse" />
                  <div className="h-3 w-8 rounded bg-white/[0.04] animate-pulse" />
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottlenecks card */}
        <div className="card p-5 space-y-3">
          <div className="h-4 w-32 rounded bg-white/[0.08] animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-10 w-10 rounded-lg bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="h-5 w-12 rounded-full bg-white/[0.06] animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent campaigns */}
      <div className="card">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <div className="h-4 w-36 rounded bg-white/[0.06] animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04]" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-9 w-9 rounded-lg bg-white/[0.06] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3.5 w-1/3 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-white/[0.04] animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
