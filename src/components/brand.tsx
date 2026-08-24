export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo-mark.png"
      alt="Advrix"
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
      draggable={false}
      className={`mix-blend-screen select-none ${className}`}
    />
  );
}
