"use client";

import { ChevronRight, UserCheck, Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { ProvinceStat } from "@/lib/types";

export function ProvinceGrid({
  provinces,
  nationalTotal,
  selectedId,
  onSelect,
}: {
  provinces: ProvinceStat[];
  nationalTotal: number;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const max = Math.max(...provinces.map((p) => p.total), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {provinces.map((province, index) => {
        const width = Math.round((province.total / max) * 100);
        const share =
          nationalTotal > 0 ? Math.round((province.total / nationalTotal) * 100) : 0;
        const activeRate =
          province.total > 0 ? Math.round((province.active / province.total) * 100) : 0;
        const selected = selectedId === province.id;

        return (
          <button
            key={province.id}
            type="button"
            onClick={() => onSelect(province.id)}
            className={cn(
              "group relative overflow-hidden rounded-xl border p-5 text-left transition-all duration-200",
              selected
                ? "border-brand-400 bg-brand-50 shadow-[var(--shadow-elevated)] ring-2 ring-brand-200"
                : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-[var(--shadow-card)]",
            )}
          >
            <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-[10px] font-bold text-brand-700 ring-1 ring-brand-100">
              {index + 1}
            </div>

            <div className="flex items-start justify-between gap-2 pr-8">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {province.code}
                </p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">{province.name}</p>
              </div>
              <ChevronRight
                className={cn(
                  "h-5 w-5 shrink-0 transition",
                  selected ? "text-brand-600" : "text-slate-300 group-hover:text-brand-500",
                )}
              />
            </div>

            <p className="mt-3 text-3xl font-bold tabular-nums text-brand-800">
              {formatNumber(province.total)}
            </p>
            <p className="text-xs text-slate-500">{share} % du total national</p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <UserCheck className="h-3.5 w-3.5" />
                {formatNumber(province.active)} actifs ({activeRate} %)
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(province.total - province.active)} autres
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
