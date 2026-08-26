"use client";

import { cn } from "@/lib/utils";

interface Loader3DProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE_MAP = {
  sm: { cube: 24, font: 8 },
  md: { cube: 48, font: 14 },
  lg: { cube: 72, font: 16 },
} as const;

export default function Loader3D({ size = "md", className, label }: Loader3DProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {/* 3D Cube */}
      <div
        className="relative"
        style={{
          width: s.cube,
          height: s.cube,
          perspective: s.cube * 4,
        }}
      >
        <div
          className="absolute inset-0 animate-spin3d"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-md border border-brand-300/40 bg-brand-300/10 shadow-[inset_0_0_12px_rgba(133,222,133,0.15)]"
            style={{ transform: `translateZ(${s.cube / 2}px)` }}
          />
          {/* Back */}
          <div
            className="absolute inset-0 rounded-md border border-brand-300/30 bg-brand-300/5 shadow-[inset_0_0_12px_rgba(133,222,133,0.1)]"
            style={{ transform: `rotateY(180deg) translateZ(${s.cube / 2}px)` }}
          />
          {/* Right */}
          <div
            className="absolute inset-0 rounded-md border border-brand-300/35 bg-brand-300/8 shadow-[inset_0_0_12px_rgba(133,222,133,0.12)]"
            style={{ transform: `rotateY(90deg) translateZ(${s.cube / 2}px)` }}
          />
          {/* Left */}
          <div
            className="absolute inset-0 rounded-md border border-brand-300/25 bg-brand-300/5 shadow-[inset_0_0_12px_rgba(133,222,133,0.08)]"
            style={{ transform: `rotateY(-90deg) translateZ(${s.cube / 2}px)` }}
          />
          {/* Top */}
          <div
            className="absolute inset-0 rounded-md border border-brand-300/50 bg-brand-300/15 shadow-[inset_0_0_16px_rgba(133,222,133,0.2)]"
            style={{ transform: `rotateX(90deg) translateZ(${s.cube / 2}px)` }}
          />
          {/* Bottom */}
          <div
            className="absolute inset-0 rounded-md border border-brand-300/20 bg-brand-300/3"
            style={{ transform: `rotateX(-90deg) translateZ(${s.cube / 2}px)` }}
          />
        </div>

        {/* Glow ring */}
        <div className="absolute inset-[-6px] rounded-full bg-brand-300/8 blur-xl animate-pulse" />
      </div>

      {/* Label */}
      {label && (
        <p
          className="text-slate-400 font-medium tracking-wide animate-pulse"
          style={{ fontSize: s.font }}
        >
          {label}
        </p>
      )}
    </div>
  );
}
