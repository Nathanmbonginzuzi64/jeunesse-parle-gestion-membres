"use client";

import Link from "next/link";
import { Building2, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatNumber } from "@/lib/utils";
import type { Structure } from "@/lib/types";
import { useState } from "react";

interface TreeProvince {
  id: number;
  code: string;
  name: string;
  cities?: Array<{
    id: number;
    name: string;
    communes?: Array<{ id: number; name: string }>;
    structures?: Structure[];
  }>;
  structures?: Structure[];
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

  return (
    <ul className="space-y-2">
      {data.map((province) => {
        const provinceOpen = openProvinces[province.id] ?? true;
        return (
          <li key={province.id} className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium"
              onClick={() => setOpenProvinces((c) => ({ ...c, [province.id]: !provinceOpen }))}
            >
              {provinceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <MapPin className="h-4 w-4 text-brand-600" />
              {province.name}
              <span className="ml-auto text-xs text-slate-400">{province.code}</span>
            </button>
            {provinceOpen && (
              <div className="border-t border-slate-100 px-4 pb-3">
                {(province.cities ?? []).map((city) => {
                  const cityOpen = openCities[city.id] ?? false;
                  return (
                    <div key={city.id} className="mt-2 ml-6">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 py-1.5 text-sm text-slate-700"
                        onClick={() => setOpenCities((c) => ({ ...c, [city.id]: !cityOpen }))}
                      >
                        {cityOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        {city.name}
                        <span className="text-xs text-slate-400">{(city.structures ?? []).length} structure(s)</span>
                      </button>
                      {cityOpen && (
                        <ul className="ml-6 space-y-1 border-l border-slate-200 pl-3">
                          {(city.communes ?? []).map((commune) => (
                            <li key={commune.id} className="text-xs text-slate-500">
                              {commune.name}
                            </li>
                          ))}
                          {(city.structures ?? []).map((structure) => (
                            <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} />
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
                {(province.structures ?? []).map((structure) => (
                  <TreeStructure key={structure.id} structure={structure} onSelect={onSelectStructure} className="ml-6 mt-2" />
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
    <button
      type="button"
      onClick={() => onSelect?.(structure)}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50",
        className,
      )}
    >
      <Building2 className="h-3.5 w-3.5 text-brand-500" />
      <span className="font-medium">{structure.name}</span>
      <Badge tone={structure.is_active ? "success" : "neutral"} className="ml-auto text-[10px]">
        {formatNumber(structure.members_count ?? 0)} membres
      </Badge>
    </button>
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
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{structure.name}</p>
              <p className="font-mono text-[11px] text-slate-400">{structure.code}</p>
            </div>
            <Badge tone={structure.is_active ? "success" : "neutral"}>
              {structure.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {structure.province?.name}
            {structure.city ? ` · ${structure.city.name}` : ""}
          </p>
          <p className="mt-3 text-2xl font-semibold text-brand-700 tabular-nums">
            {formatNumber(structure.members_count ?? 0)}
          </p>
          <p className="text-[11px] text-slate-400">membres rattachés</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/membres?structure_id=${structure.id}`} className="text-xs font-medium text-brand-700">
              Voir membres
            </Link>
            <button type="button" className="text-xs font-medium text-slate-600" onClick={() => onEdit(structure)}>
              Modifier
            </button>
            {structure.is_active && (
              <button type="button" className="text-xs font-medium text-red-600" onClick={() => onDisable(structure)}>
                Désactiver
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
