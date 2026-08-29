"use client";

import Link from "next/link";
import { Building2, ChevronDown, ChevronRight, MapPin, Users } from "lucide-react";
import { structureTypeLabel } from "@/components/structures/structures-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import type { Structure } from "@/lib/types";
import { useState } from "react";

interface TreeQuartier {
  id: number;
  name: string;
  structures?: Structure[];
}

interface TreeCommune {
  id: number;
  name: string;
  quartiers?: TreeQuartier[];
  structures?: Structure[];
}

interface TreeDistrict {
  id: number;
  name: string;
  communes?: TreeCommune[];
  structures?: Structure[];
}

interface TreeCity {
  id: number;
  name: string;
  districts?: TreeDistrict[];
  structures?: Structure[];
}

interface TreeProvince {
  id: number;
  code: string;
  name: string;
  cities?: TreeCity[];
  structures?: Structure[];
}

function countStructures(province: TreeProvince): number {
  let count = province.structures?.length ?? 0;
  for (const city of province.cities ?? []) {
    count += city.structures?.length ?? 0;
    for (const district of city.districts ?? []) {
      count += district.structures?.length ?? 0;
      for (const commune of district.communes ?? []) {
        count += commune.structures?.length ?? 0;
        for (const quartier of commune.quartiers ?? []) {
          count += quartier.structures?.length ?? 0;
        }
      }
    }
  }
  return count;
}

export function TerritoryTree({
  data,
  onSelectStructure,
}: {
  data: TreeProvince[];
  onSelectStructure?: (structure: Structure) => void;
}) {
  const [openProvinces, setOpenProvinces] = useState<Record<number, boolean>>({});
  const [openCities, setOpenCities] = useState<Record<number, boolean>>({});
  const [openDistricts, setOpenDistricts] = useState<Record<number, boolean>>({});
  const [openCommunes, setOpenCommunes] = useState<Record<number, boolean>>({});

  return (
    <ul className="space-y-3">
      {data.map((province) => {
        const provinceOpen = openProvinces[province.id] ?? true;
        const cityCount = province.cities?.length ?? 0;
        const structureCount = countStructures(province);

        return (
          <li
            key={province.id}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)]"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 bg-gradient-to-r from-brand-50/80 to-white px-4 py-3.5 text-left transition hover:from-brand-50"
              onClick={() => setOpenProvinces((c) => ({ ...c, [province.id]: !provinceOpen }))}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                {provinceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </span>
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900">{province.name}</span>
                <span className="text-[11px] text-slate-500">
                  {cityCount} ville(s) · {structureCount} structure(s)
                </span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{province.code}</span>
            </button>

            {provinceOpen && (
              <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                {(province.cities ?? []).map((city) => {
                  const cityOpen = openCities[city.id] ?? false;
                  return (
                    <div key={city.id} className="mt-2 ml-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-800 hover:bg-white"
                        onClick={() => setOpenCities((c) => ({ ...c, [city.id]: !cityOpen }))}
                      >
                        {cityOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {city.name}
                        <span className="ml-auto text-xs font-normal text-slate-500">
                          {(city.districts ?? []).length} district(s)
                        </span>
                      </button>
                      {cityOpen && (
                        <div className="ml-4 space-y-1 border-l-2 border-brand-200 pl-3 pt-1">
                          {(city.districts ?? []).map((district) => {
                            const districtOpen = openDistricts[district.id] ?? false;
                            return (
                              <div key={district.id}>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 py-1 text-left text-xs font-medium text-slate-700 hover:text-brand-700"
                                  onClick={() => setOpenDistricts((c) => ({ ...c, [district.id]: !districtOpen }))}
                                >
                                  {districtOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                  District {district.name}
                                </button>
                                {districtOpen && (
                                  <div className="ml-4 space-y-1 border-l border-slate-200 pl-2">
                                    {(district.communes ?? []).map((commune) => {
                                      const communeOpen = openCommunes[commune.id] ?? false;
                                      return (
                                        <div key={commune.id}>
                                          <button
                                            type="button"
                                            className="flex w-full items-center gap-2 py-0.5 text-left text-xs text-slate-600 hover:text-brand-700"
                                            onClick={() => setOpenCommunes((c) => ({ ...c, [commune.id]: !communeOpen }))}
                                          >
                                            {communeOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                            Commune {commune.name}
                                          </button>
                                          {communeOpen && (
                                            <div className="ml-3 space-y-1 border-l border-slate-100 pl-2">
                                              {(commune.quartiers ?? []).map((quartier) => (
                                                <div key={quartier.id} className="py-0.5">
                                                  <p className="text-[11px] font-medium text-slate-500">Quartier {quartier.name}</p>
                                                  {(quartier.structures ?? []).map((structure) => (
                                                    <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} />
                                                  ))}
                                                </div>
                                              ))}
                                              {(commune.structures ?? []).map((structure) => (
                                                <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {(district.structures ?? []).map((structure) => (
                                      <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {(city.structures ?? []).map((structure) => (
                            <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(province.structures ?? []).map((structure) => (
                  <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} className="ml-3 mt-2" />
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TreeStructure({
  structure,
  onSelect,
  className,
}: {
  structure: Structure;
  onSelect?: (structure: Structure) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-lg bg-white px-2 py-2 ring-1 ring-slate-100", className)}>
      <button
        type="button"
        onClick={() => onSelect?.(structure)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:text-brand-700"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-brand-500" />
        <span className="min-w-0">
          <span className="block truncate font-medium">{structure.name}</span>
          <span className="text-[10px] text-slate-400">{structureTypeLabel(structure.type)}</span>
        </span>
      </button>
      <Badge tone={structure.is_active ? "success" : "neutral"} className="text-[10px]">
        {formatNumber(structure.members_count ?? 0)} mbr.
      </Badge>
      <Link href={`/membres?structure_id=${structure.id}`} className="text-[10px] font-medium text-brand-700 hover:underline">
        Voir
      </Link>
    </div>
  );
}

export function StructureCards({
  structures,
  onEdit,
  onDisable,
}: {
  structures: Structure[];
  onEdit: (structure: Structure) => void;
  onDisable: (structure: Structure) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {structures.map((structure) => (
        <article
          key={structure.id}
          className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-brand-300 hover:shadow-[var(--shadow-elevated)]"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-gold-400 to-emerald-500 opacity-80" />
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{structure.name}</p>
              <p className="font-mono text-[11px] text-brand-700">{structure.code}</p>
            </div>
            <Badge tone={structure.is_active ? "success" : "neutral"}>
              {structure.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{structureTypeLabel(structure.type)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {structure.province?.name}
            {structure.city ? ` · ${structure.city.name}` : ""}
            {structure.district ? ` · ${structure.district.name}` : ""}
            {structure.commune ? ` · ${structure.commune.name}` : ""}
            {structure.quartier ? ` · ${structure.quartier.name}` : structure.zone ? ` · ${structure.zone.name}` : ""}
          </p>
          <div className="mt-4 flex items-end justify-between gap-2">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-brand-700">
                {formatNumber(structure.members_count ?? 0)}
              </p>
              <p className="text-[11px] text-slate-400">membres rattachés</p>
            </div>
            {structure.leader && (
              <p className="max-w-[8rem] truncate text-right text-[10px] text-slate-500">
                {structure.leader.full_name}
              </p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Link href={`/membres?structure_id=${structure.id}`}>
              <Button variant="outline" size="sm">
                <Users className="h-3.5 w-3.5" />
                Membres
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => onEdit(structure)}>
              Modifier
            </Button>
            {structure.is_active && (
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDisable(structure)}>
                Désactiver
              </Button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
