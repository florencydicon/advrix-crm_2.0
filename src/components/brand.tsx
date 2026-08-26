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
