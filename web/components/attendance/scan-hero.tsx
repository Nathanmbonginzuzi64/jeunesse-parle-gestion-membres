"use client";

import { ScanFace } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export function ScanHero({ sessionCount }: { sessionCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-emerald-200/50 bg-gradient-to-br from-emerald-700 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 left-1/3 h-36 w-36 rounded-full bg-emerald-300/15 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <ScanFace className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-100/90">Pointage</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Scanner un membre</h1>
            <p className="mt-1 max-w-xl text-sm text-emerald-50/90">
              Enregistrez la présence en temps réel par Windows Hello, QR code ou empreinte digitale.
            </p>
          </div>
        </div>

        {sessionCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15">
            {formatNumber(sessionCount)} pointage(s) cette session
          </span>
        ) : null}
      </div>
    </div>
  );
}
