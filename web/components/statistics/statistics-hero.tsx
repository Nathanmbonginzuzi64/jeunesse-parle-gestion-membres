"use client";

import { BarChart3, Globe2, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { StatisticsOverview } from "@/lib/types";

const PERIOD_LABELS: Record<string, string> = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
  "12m": "12 mois",
};

function buildScopeLabel(scope?: StatisticsOverview["scope"]) {
  if (!scope?.province) return "Échelle nationale · RDC";
  return [scope.province, scope.city, scope.structure].filter(Boolean).join(" · ");
}

export function StatisticsHero({
  scope,
  kpis,
  period,
}: {
  scope?: StatisticsOverview["scope"];
  kpis?: StatisticsOverview["kpis"];
  period: string;
}) {
  const activeRate =
    kpis && kpis.members.total > 0
      ? Math.round((kpis.members.active / kpis.members.total) * 100)
      : 0;

  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-gold-500/15 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Analyse & pilotage
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Statistiques</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-100/90">
              <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {buildScopeLabel(scope)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/15">
            Période · {PERIOD_LABELS[period] ?? period}
          </span>
          {scope?.role && (
            <span className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/15">
              {scope.role}
            </span>
          )}
        </div>
      </div>

      {kpis && (
        <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: "Membres total", value: formatNumber(kpis.members.total) },
            {
              label: "Taux d'activité",
              value: `${activeRate} %`,
              icon: TrendingUp,
            },
            {
              label: "Nouveaux (30 j)",
              value: formatNumber(kpis.members.new_last_30_days),
            },
          ].map((chip) => (
            <div
              key={chip.label}
              className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-inset ring-white/10 backdrop-blur-sm"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-brand-100/80">
                {chip.label}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">{chip.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
