import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonBar({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-white/[0.06] animate-pulse",
        className
      )}
      style={style}
    />
  );
}

export function SkeletonCircle({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-full bg-white/[0.06] animate-pulse",
        className
      )}
      style={style}
    />
  );
}

export function SkeletonCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("card p-4 space-y-3", className)}>
      {children}
    </div>
  );
}

export function SkeletonStatCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="card p-4 space-y-2" style={{ animationDelay: `${delay}ms` }}>
      <SkeletonBar className="h-3 w-20" />
      <SkeletonBar className="h-7 w-16" />
      <SkeletonBar className="h-3 w-24" />
    </div>
  );
}

export function SkeletonTableRow({ columns = 4, delay = 0 }: { columns?: number; delay?: number }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBar
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-1/4" : i === columns - 1 ? "w-1/6 ml-auto" : "w-1/6"
          )}
        />
      ))}
    </div>
  );
}
