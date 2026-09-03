"use client";

import { cn } from "@/lib/utils";
import {
  TEXT_BACKGROUNDS,
  getTextBackground,
  type TextBackgroundId,
} from "@/lib/news/text-backgrounds";

interface TextBackgroundPickerProps {
  value: TextBackgroundId;
  onChange: (value: TextBackgroundId) => void;
  previewText?: string;
}

export function TextBackgroundPicker({ value, onChange, previewText }: TextBackgroundPickerProps) {
  const active = getTextBackground(value);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Fond de publication</p>
      <p className="text-xs text-slate-500">
        Choisissez un arrière-plan coloré pour mettre en valeur votre message, comme sur Facebook.
      </p>

      <div
        className={cn(
          "flex min-h-[160px] items-center justify-center rounded-2xl p-8 text-center shadow-inner transition-all",
          active.className,
        )}
      >
        <p className={cn("max-w-md text-xl font-bold leading-snug", active.textClass)}>
          {previewText || "Votre message apparaîtra ici…"}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {TEXT_BACKGROUNDS.map((bg) => (
          <button
            key={bg.id}
            type="button"
            title={bg.label}
            onClick={() => onChange(bg.id)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-xl ring-2 ring-offset-2 transition hover:scale-105",
              bg.className,
              value === bg.id ? "ring-brand-500" : "ring-transparent hover:ring-slate-300",
            )}
          >
            <span className="sr-only">{bg.label}</span>
            {value === bg.id ? (
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-lg text-white">✓</span>
            ) : null}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-500">Sélectionné : {active.label}</p>
    </div>
  );
}

interface TextBackgroundBannerProps {
  backgroundId?: string | null;
  title?: string;
  body: string;
  compact?: boolean;
  className?: string;
}

export function TextBackgroundBanner({
  backgroundId,
  title,
  body,
  compact = false,
  className,
}: TextBackgroundBannerProps) {
  const bg = getTextBackground(backgroundId);

  if (!backgroundId || backgroundId === "none") {
    return null;
  }

  const displayBody = body?.trim() || "";
  const displayTitle = title?.trim() || "";
  const text =
    compact && displayBody.length > 200
      ? `${displayBody.slice(0, 200)}…`
      : displayBody || displayTitle || "";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-md",
        compact ? "min-h-[140px]" : "min-h-[220px]",
        bg.className,
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
      <div className={cn("relative flex h-full flex-col items-center justify-center p-6 text-center", bg.textClass)}>
        {!compact && displayTitle ? <h3 className="mb-2 text-lg font-bold opacity-95">{displayTitle}</h3> : null}
        <p className={cn("font-semibold leading-relaxed", compact ? "text-base sm:text-lg" : "text-xl md:text-2xl")}>{text}</p>
      </div>
    </div>
  );
}
