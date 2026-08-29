"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] leading-snug text-white shadow-lg group-hover:block group-focus-within:block"
      >
        {content}
      </span>
    </span>
  );
}
