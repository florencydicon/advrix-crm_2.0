export default function UpdatesLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-7 w-28 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-9 w-32 rounded-xl bg-white/[0.06] animate-pulse" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <div className="h-7 w-14 rounded-full bg-white/[0.08] animate-pulse" />
        <div className="h-7 w-20 rounded-full bg-white/[0.04] animate-pulse" />
      </div>

      {/* Notification list */}
      <div className="card divide-y divide-white/[0.06] overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 px-5 py-4" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-10 w-10 rounded-xl bg-white/[0.06] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-1/3 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-3 w-14 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="h-3 w-2/3 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-white/[0.03] animate-pulse" />
            </div>
            {i < 3 && <div className="h-5 w-8 rounded-full bg-brand-300/10 animate-pulse shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
