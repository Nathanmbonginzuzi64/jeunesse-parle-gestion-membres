"use client";

import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

function SignalBarsAnimated({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-5 items-end gap-0.5", className)} aria-hidden>
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="jp-signal-bar w-1 rounded-sm bg-brand-600"
          style={{ animationDelay: `${index * 0.18}s` }}
        />
      ))}
    </div>
  );
}

export function LiveLocationSharingBadge({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-brand-200/80 bg-gradient-to-r from-brand-50 via-white to-emerald-50/70 px-4 py-3 shadow-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <span className="jp-signal-wave absolute inset-0 rounded-full border-2 border-brand-500/55" />
        <span className="jp-signal-wave jp-signal-wave-delay-1 absolute inset-0 rounded-full border-2 border-brand-500/45" />
        <span className="jp-signal-wave jp-signal-wave-delay-2 absolute inset-0 rounded-full border-2 border-emerald-500/35" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-md ring-4 ring-brand-100">
          <Radio className="h-4 w-4" aria-hidden />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-900">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-brand-700/85">{subtitle}</p> : null}
      </div>

      <SignalBarsAnimated className="hidden shrink-0 sm:flex" />
    </div>
  );
}
