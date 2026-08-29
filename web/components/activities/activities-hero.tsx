"use client";

import { CalendarDays, CheckCircle2, Clock3, FileEdit } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export function ActivitiesHero({
  total,
  upcoming,
  ongoing,
  drafts,
}: {
  total?: number;
  upcoming?: number;
  ongoing?: number;
  drafts?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <CalendarDays className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Mobilisation
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Activités</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-100/90">
              Réunions, formations, campagnes et missions sur le terrain JP-RDC.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {total !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatNumber(total)} au total
            </span>
          )}
          {upcoming !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <Clock3 className="h-3.5 w-3.5" />
              {formatNumber(upcoming)} à venir
            </span>
          )}
          {ongoing !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {formatNumber(ongoing)} en cours
            </span>
          )}
          {drafts !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <FileEdit className="h-3.5 w-3.5" />
              {formatNumber(drafts)} brouillon(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
