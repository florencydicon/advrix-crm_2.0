export default function ContentLoading() {
  return (
    <div className="h-full p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="space-y-1.5">
        <div className="h-7 w-52 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-72 rounded bg-white/[0.04] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card px-3 md:px-4 py-3 space-y-1.5">
            <div className="h-6 w-10 rounded bg-white/[0.08] animate-pulse" />
            <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 w-full sm:max-w-xs rounded-xl bg-white/[0.04] animate-pulse" />
      <div className="card overflow-hidden">
        <div className="divide-y divide-white/[0.04]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-24 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-4 flex-1 rounded bg-white/[0.06] animate-pulse" />
              <div className="h-5 w-20 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
