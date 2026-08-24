export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <path d="M17 100 L50 13 L83 100" stroke="#ffffff" strokeWidth="25" strokeLinejoin="round" />
      <rect x="34" y="61" width="32" height="32" rx="10" fill="#85DE85" />
    </svg>
  );
}

export function BrandWordmark({
  subtitle = true,
  size = "md",
}: {
  subtitle?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const titleCls =
    size === "lg"
      ? "text-3xl"
      : size === "sm"
        ? "text-lg"
        : "text-xl";
  return (
    <div className="leading-none select-none">
      <p className={`font-brand font-extrabold tracking-tight text-white ${titleCls}`}>Advrix</p>
      {subtitle && (
        <p className="mt-1 text-[9px] font-medium tracking-[0.32em] text-slate-400 uppercase">
          Media Pvt Ltd
        </p>
      )}
    </div>
  );
}
