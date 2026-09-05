"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { cn } from "@/lib/utils";

export function ReportPageHeader({
  title,
  description,
  icon: Icon,
  eyebrow = "Rapports & Analyses",
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <DashboardAnimate>
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 p-5 text-white shadow-lg sm:p-6",
          className,
        )}
      >
        <div className="pointer-events-none absolute -top-10 right-0 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-brand-400/20 blur-2xl" aria-hidden />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-brand-100 uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-brand-50/85">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </DashboardAnimate>
  );
}
