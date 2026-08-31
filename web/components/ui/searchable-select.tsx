"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  hint?: string;
}

export function SearchableSelect({
  label,
  hint,
  error,
  required,
  disabled,
  placeholder = "Rechercher et sélectionner…",
  emptyMessage = "Aucun résultat",
  loading,
  value,
  onChange,
  options = [],
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options?: SearchableSelectOption[];
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value ?? "")),
    [options, value],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        (option.hint?.toLowerCase().includes(needle) ?? false),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function selectOption(option: SearchableSelectOption) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
          }}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-[var(--radius-control)] border border-slate-300 bg-white px-3 py-2 text-left text-sm transition-colors",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none",
            disabled && "cursor-not-allowed bg-slate-50 text-slate-500",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            !selected && "text-slate-400",
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
        </button>

        {open && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
          >
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4 text-slate-400" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filtrer la liste…"
                  className="w-full rounded-md border border-slate-200 py-2 pr-3 pl-8 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
              </div>
            </div>

            <ul className="max-h-52 overflow-y-auto py-1">
              {loading && (
                <li className="px-3 py-2 text-xs text-slate-500">Chargement…</li>
              )}
              {!loading && filtered.length === 0 && (
                <li className="px-3 py-2 text-xs text-slate-500">{emptyMessage}</li>
              )}
              {!loading &&
                filtered.map((option) => {
                  const active = String(option.value) === String(value ?? "");
                  return (
                    <li key={String(option.value)}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => selectOption(option)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                          active && "bg-brand-50 text-brand-800",
                        )}
                      >
                        <span>
                          <span className="block truncate font-medium">{option.label}</span>
                          {option.hint && (
                            <span className="block truncate text-xs text-slate-500">{option.hint}</span>
                          )}
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}
      </div>
    </Field>
  );
}
