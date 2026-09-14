export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1.5">
        <div className="h-7 w-24 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-64 rounded bg-white/[0.04] animate-pulse" />
      </div>
      <div className="card p-4 flex gap-3">
        <div className="h-8 w-48 rounded bg-white/[0.06] animate-pulse" />
        <div className="ml-auto h-8 w-32 rounded bg-white/[0.06] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-7 w-14 rounded bg-white/[0.08] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="card p-5 space-y-3">
        <div className="h-4 w-40 rounded bg-white/[0.08] animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
