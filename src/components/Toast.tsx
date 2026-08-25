"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { X, CircleCheck, CircleAlert, Info } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toast: (message: string, type?: Toast["type"]) => void;
}

const ToastContext = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-xs w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const ICON_MAP = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const COLOR_MAP = {
  success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  error: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  info: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

const BAR_MAP = {
  success: "bg-emerald-400",
  error: "bg-rose-400",
  info: "bg-sky-400",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICON_MAP[toast.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(onDismiss, 200);
      return () => clearTimeout(t);
    }
  }, [visible, onDismiss]);

  return (
    <div
      className={`pointer-events-auto rounded-xl border shadow-lg shadow-black/30 bg-night-850 px-4 py-3 transition-all duration-200 ease-out ${
        COLOR_MAP[toast.type]
      } ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <p className="text-xs font-medium text-white flex-1 leading-snug">{toast.message}</p>
        <button onClick={onDismiss} className="p-0.5 rounded text-slate-400 hover:text-white transition-colors shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 h-0.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${BAR_MAP[toast.type]} transition-all ease-linear`}
          style={{
            width: visible ? "0%" : "100%",
            transitionDuration: "1800ms",
          }}
        />
      </div>
    </div>
  );
}
