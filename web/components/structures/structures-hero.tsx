"use client";

import { Building2, Layers, MapPin, Network } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export function StructuresHero({
  structuresCount,
  provincesCount,
  citiesCount,
  districtsCount,
  quartiersCount,
}: {
  structuresCount?: number;
  provincesCount?: number;
  citiesCount?: number;
  districtsCount?: number;
  quartiersCount?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <Building2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Organisation territoriale
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Structures & territoires</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-100/90">
              Provinces, villes, districts, communes, quartiers et structures de mobilisation JP-RDC.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {provincesCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <MapPin className="h-3.5 w-3.5" />
              {formatNumber(provincesCount)} provinces
            </span>
          )}
          {citiesCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <Network className="h-3.5 w-3.5" />
              {formatNumber(citiesCount)} villes
            </span>
          )}
          {districtsCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <Layers className="h-3.5 w-3.5" />
              {formatNumber(districtsCount)} districts
            </span>
          )}
          {quartiersCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <MapPin className="h-3.5 w-3.5" />
              {formatNumber(quartiersCount)} quartiers
            </span>
          )}
          {structuresCount !== undefined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 font-medium ring-1 ring-inset ring-white/15">
              <Layers className="h-3.5 w-3.5" />
              {formatNumber(structuresCount)} structures
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const STRUCTURE_TYPE_LABELS: Record<string, string> = {
  coordination_nationale: "Coordination nationale",
  coordination_provinciale: "Coordination provinciale",
  coordination_ville: "Coordination ville",
  antenne: "Antenne",
  cellule: "Cellule",
  section: "Section",
};

export function structureTypeLabel(type: string) {
  return STRUCTURE_TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}
