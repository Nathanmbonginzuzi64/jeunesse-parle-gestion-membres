"use client";

import { Bell, BellRing, MailOpen } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export function NotificationsHero({
  total,
  unread,
}: {
  total?: number;
  unread?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-amber-200/40 bg-gradient-to-br from-slate-800 via-brand-800 to-brand-950 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-36 w-36 rounded-full bg-brand-400/15 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <Bell className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Centre d&apos;alertes
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Notifications</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-100/90">
              Validations, cartes, activités et messages de mobilisation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {total !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <MailOpen className="h-3.5 w-3.5" />
              {formatNumber(total)} message(s)
            </span>
          )}
          {unread !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/25 px-3 py-1.5 font-medium ring-1 ring-inset ring-gold-300/30">
              <BellRing className="h-3.5 w-3.5" />
              {formatNumber(unread)} non lu(s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
