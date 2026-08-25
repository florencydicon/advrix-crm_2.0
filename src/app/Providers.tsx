"use client";

import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@/components/Toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <ToastProvider>{children}</ToastProvider>
    </HeroUIProvider>
  );
}
