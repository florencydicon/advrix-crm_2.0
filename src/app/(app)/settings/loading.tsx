export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-7 w-28 rounded bg-white/[0.08] animate-pulse" />
        <div className="h-4 w-44 rounded bg-white/[0.04] animate-pulse" />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <div className="h-7 w-28 rounded-full bg-white/[0.08] animate-pulse" />
        <div className="h-7 w-20 rounded-full bg-white/[0.04] animate-pulse" />
      </div>

      {/* Search */}
      <div className="h-10 w-full sm:max-w-sm rounded-xl bg-white/[0.04] animate-pulse" />

      {/* Team table */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.06]">
          {["Name", "Role", "Status", "Actions"].map((_, i) => (
            <div key={i} className="h-3 rounded bg-white/[0.06] animate-pulse" style={{ width: i === 0 ? "25%" : i === 3 ? "10%" : "18%", animationDelay: `${i * 30}ms` }} />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04]" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-3 w-[25%]">
              <div className="h-8 w-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
              <div className="space-y-1">
                <div className="h-3.5 w-24 rounded bg-white/[0.08] animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
            <div className="h-5 w-20 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-white/[0.04] animate-pulse" />
            <div className="ml-auto flex gap-1.5">
              <div className="h-7 w-7 rounded-lg bg-white/[0.04] animate-pulse" />
              <div className="h-7 w-7 rounded-lg bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
