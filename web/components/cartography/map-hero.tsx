"use client";

import { Globe2, MapPin } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { ProvinceStat } from "@/lib/types";

function scopeLabel(
  province: ProvinceStat | null,
  city: { name: string } | null,
) {
  if (city && province) return `${province.name} · ${city.name}`;
  if (province) return province.name;
  return "République Démocratique du Congo";
}

export function MapHero({
  total,
  provinces,
  selectedProvince,
  selectedCity,
  activeCount,
}: {
  total: number;
  provinces: ProvinceStat[];
  selectedProvince: ProvinceStat | null;
  selectedCity: { name: string; total: number } | null;
  activeCount: number;
}) {
  const activeRate = total > 0 ? Math.round((activeCount / total) * 100) : 0;
  const displayTotal = selectedCity?.total ?? selectedProvince?.total ?? total;

  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-white/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Couverture territoriale
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cartographie</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-100/90">
              <Globe2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {scopeLabel(selectedProvince, selectedCity)}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15">
          {provinces.length} provinces · données agrégées
        </span>
      </div>

      <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { label: "Membres (périmètre)", value: formatNumber(displayTotal) },
          { label: "Taux d'activité", value: `${activeRate} %` },
          { label: "Actifs", value: formatNumber(activeCount) },
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
    </div>
  );
}
