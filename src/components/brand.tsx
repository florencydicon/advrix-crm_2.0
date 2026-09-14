export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-mark.png"
      alt="Advrix"
      width={36}
      height={36}
      draggable={false}
      className={`mix-blend-screen select-none ${className}`}
    />
  );
}

export function BrandLogoFull({ className }: { className?: string }) {
  return (
    <img
      src="/logo-full.png"
      alt="Advrix Media PVT LTD"
      width={140}
      height={40}
      draggable={false}
      className={`mix-blend-screen select-none ${className}`}
    />
  );
}

/** Text-only wordmark — always renders, independent of logo images. */
export function BrandWordmark({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex select-none items-center gap-2 ${className}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-300 font-brand text-sm font-bold text-night-950 shadow-sm shadow-brand-300/25">
        A
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-brand text-[15px] font-semibold tracking-tight text-white">
          Advrix
        </span>
        {!compact && (
          <span className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-[0.22em] text-brand-300/80">
            Media Pvt Ltd
          </span>
        )}
      </span>
    </span>
  );
}
