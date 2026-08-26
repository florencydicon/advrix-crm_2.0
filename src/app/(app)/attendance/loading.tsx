export default function AttendanceLoading() {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="h-7 w-32 rounded bg-white/[0.08] animate-pulse" />
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 ring-1 ring-white/10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 w-20 rounded-lg bg-white/[0.06] animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
          ))}
        </div>
      </div>

      {/* 3 punch cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-4 flex flex-col items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="h-12 w-12 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-white/[0.04] animate-pulse" />
            <div className="h-9 w-28 rounded-xl bg-white/[0.06] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Team overview grid */}
      <div className="card p-4">
        <div className="h-4 w-28 rounded bg-white/[0.06] animate-pulse mb-3" />
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="text-center space-y-1.5">
              <div className="h-8 w-12 mx-auto rounded bg-white/[0.06] animate-pulse" />
              <div className="h-3 w-14 mx-auto rounded bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent attendance rows */}
      <div className="card">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <div className="h-4 w-36 rounded bg-white/[0.06] animate-pulse" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04]" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="h-4 w-20 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-14 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-14 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-4 w-24 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-white/[0.06] animate-pulse ml-auto" />
            <div className="h-4 w-10 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
