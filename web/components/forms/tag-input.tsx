"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Field } from "@/components/ui/field";

/** Saisie de listes courtes (compétences, centres d'intérêt) sous forme d'étiquettes. */
export function TagInput({
  label,
  value,
  onChange,
  placeholder = "Saisir puis valider avec Entrée",
  hint,
  error,
  max = 30,
  suggestions = [],
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
  max?: number;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const tag = raw.trim();
    if (!tag || value.length >= max) return;
    if (value.some((item) => item.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag.slice(0, 60)]);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const available = suggestions.filter(
    (suggestion) => !value.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
  );

  return (
    <Field label={label} hint={hint ?? `${value.length}/${max}`} error={error}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-1 pr-1 pl-2 text-xs font-medium text-brand-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="rounded p-0.5 hover:bg-brand-100"
              aria-label={`Retirer ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => add(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 focus:outline-none"
        />
      </div>

      {available.length > 0 && value.length < max && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {available.slice(0, 8).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}
