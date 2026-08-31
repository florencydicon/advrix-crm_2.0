export default function NotesLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white/[0.06] animate-pulse" />
        <div className="space-y-1.5">
          <div className="h-5 w-32 rounded bg-white/[0.08] animate-pulse" />
          <div className="h-3 w-48 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-3 space-y-2" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-3 w-3/4 rounded bg-white/[0.08] animate-pulse" />
              <div className="h-2 w-1/2 rounded bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="card p-4 space-y-3">
          <div className="h-6 w-48 rounded bg-white/[0.08] animate-pulse" />
          <div className="h-40 rounded bg-white/[0.04] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
