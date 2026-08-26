"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-14 w-14 rounded-full bg-rose-400/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-rose-400" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">Something went wrong</h2>
      <p className="text-sm text-slate-400 max-w-md mb-4">
        An unexpected error occurred. Please try again or contact your administrator if the problem persists.
      </p>
      {error.digest && (
        <p className="text-[11px] text-slate-600 font-mono mb-4">Error: {error.digest}</p>
      )}
      <button onClick={reset} className="btn-primary">
        <RefreshCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
