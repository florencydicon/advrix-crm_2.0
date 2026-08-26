export default function ProjectDetailLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-5 w-48 rounded bg-white/[0.08] animate-pulse" />
          <div className="h-3 w-32 rounded bg-white/[0.04] animate-pulse" />
        </div>
        <div className="ml-auto h-6 w-20 rounded-full bg-white/[0.06] animate-pulse" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-3 space-y-1.5" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="h-3 w-14 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-6 w-10 rounded bg-white/[0.08] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Deliverable sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="card overflow-hidden" style={{ animationDelay: `${i * 100}ms` }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div className="h-4 w-32 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-5 w-8 rounded-full bg-white/[0.06] animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
              <div className="h-8 w-8 rounded-lg bg-white/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-1/3 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-2.5 w-1/4 rounded bg-white/[0.04] animate-pulse" />
              </div>
              <div className="h-5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      ))}

      {/* Team section */}
      <div className="card p-4">
        <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03]" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="h-8 w-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
              <div className="space-y-1">
                <div className="h-3 w-16 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
