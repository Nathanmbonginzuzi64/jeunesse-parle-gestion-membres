"use client";

/* eslint-disable @next/next/no-img-element */

import { cn } from "@/lib/utils";

export function Logo({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="La Jeunesse Parle"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function BrandMark({
  className,
  subtitle = "Gestion des membres",
  size = 40,
  inverted = false,
}: {
  className?: string;
  subtitle?: string | null;
  size?: number;
  inverted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={size} />
      <div className="min-w-0 leading-tight">
        <p
          className={cn(
            "truncate text-sm font-bold tracking-tight",
            inverted ? "text-white" : "text-slate-900",
          )}
        >
          LA JEUNESSE PARLE
        </p>
        {subtitle && (
          <p className={cn("truncate text-[11px]", inverted ? "text-white/75" : "text-slate-500")}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
