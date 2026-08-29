"use client";

import { cn } from "@/lib/utils";

export function scorePassword(value: string): number {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Fort"];
const COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full bg-slate-200 transition-colors",
              index < score && COLORS[score],
            )}
          />
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Force : {LABELS[score]}</p>
    </div>
  );
}
