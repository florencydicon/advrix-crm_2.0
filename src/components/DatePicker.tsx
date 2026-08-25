"use client";

import { useState, useEffect } from "react";
import { DatePicker as HeroDatePicker } from "@heroui/react";
import { parseDate, today, getLocalTimeZone } from "@internationalized/date";
import { X } from "lucide-react";

export function DatePicker({
  name,
  value,
  onChange,
  required,
  placeholder = "Select date…",
}: {
  name?: string;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [internal, setInternal] = useState(value || "");

  useEffect(() => setInternal(value || ""), [value]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={internal} />
      <HeroDatePicker
        variant="bordered"
        radius="lg"
        size="sm"
        granularity="day"
        isRequired={required}
        value={internal ? (parseDate(internal) as unknown as any) : null}
        onChange={(v: any) => {
          const iso = v ? String(v) : "";
          if (iso !== internal) {
            setInternal(iso);
            onChange?.(iso);
          }
        }}
        placeholderValue={today(getLocalTimeZone()) as unknown as any}
        aria-label={placeholder}
        classNames={{
          base: "w-full",
          inputWrapper: "min-h-8 h-8 bg-white/[0.03] border-white/10 group-data-[hover=true]:bg-white/[0.05]",
          input: "text-xs",
          popoverContent: "bg-night-850 border border-white/10",
        }}
      />
      {internal && (
        <button
          type="button"
          onClick={() => {
            setInternal("");
            onChange?.("");
          }}
          className="absolute right-9 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10 text-slate-500 z-10"
          title="Clear date"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
