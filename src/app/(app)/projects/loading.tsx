export default function ProjectsLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-7 w-40 rounded bg-white/[0.08] animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-white/[0.06] animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* Search */}
      <div className="h-10 w-full sm:max-w-sm rounded-xl bg-white/[0.04] animate-pulse" />

      {/* Client cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-3" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-2/3 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-5 w-8 mx-auto rounded bg-white/[0.08] animate-pulse" />
                  <div className="h-2.5 w-10 mx-auto rounded bg-white/[0.04] animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="flex gap-1">
              <div className="h-5 w-12 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
