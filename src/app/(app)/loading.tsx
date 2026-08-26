export default function AppLoading() {
  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-30 w-64 bg-night-950 border-r border-white/[0.06]">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="h-10 w-32 rounded-lg bg-white/[0.06] animate-pulse" />
        </div>
        <div className="px-3 space-y-1.5 mt-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-xl bg-white/[0.04] animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        {/* Header skeleton */}
        <header className="sticky top-0 z-20 flex items-center justify-between bg-night-950/80 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 md:px-6">
          <div className="h-4 w-32 rounded bg-white/[0.06] animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/[0.06] animate-pulse" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="p-4 sm:p-6 pb-24 md:pb-6 flex-1 space-y-4">
          <div className="h-24 rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-white/[0.04] animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-white/[0.04] animate-pulse" />
        </main>
      </div>
    </div>
  );
}
