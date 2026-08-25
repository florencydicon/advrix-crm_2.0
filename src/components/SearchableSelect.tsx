"use client";

import { useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/react";

export interface SearchableOption {
  value: string;
  label: string;
  search?: string;
}

export function SearchableSelect({
  name,
  options,
  value,
  onChange,
  placeholder = "Search…",
}: {
  name?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.search || o.label).toLowerCase().includes(q)
    );
  }, [inputValue, options]);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <Autocomplete
        variant="bordered"
        radius="lg"
        size="sm"
        aria-label={placeholder}
        placeholder={placeholder}
        inputValue={inputValue}
        onInputChange={(v) => setInputValue(v)}
        selectedKey={value || null}
        onSelectionChange={(key) => {
          if (key !== null) {
            onChange(String(key));
            setInputValue("");
          }
        }}
        defaultInputValue=""
        items={filtered}
        allowsCustomValue={false}
        menuTrigger="focus"
        classNames={{
          popoverContent: "bg-night-850 border border-white/10",
        }}
        inputProps={{
          classNames: {
            input: "text-xs",
            inputWrapper:
              "min-h-8 h-8 bg-white/[0.03] border-white/10 group-data-[hover=true]:bg-white/[0.05]",
          },
          placeholder,
        }}
      >
        {(option) => (
          <AutocompleteItem key={option.value} textValue={option.label}>
            <span className={`text-xs ${option.value === value ? "text-brand-300 font-medium" : "text-slate-200"}`}>
              {option.label}
            </span>
          </AutocompleteItem>
        )}
      </Autocomplete>
    </div>
  );
}
