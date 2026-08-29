import { MapPin } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { ProvinceStat } from "@/lib/types";

export function ProvinceRanking({
  items,
  startRank = 1,
  maxTotal,
}: {
  items: ProvinceStat[];
  /** Rang affiché du premier élément (pagination). */
  startRank?: number;
  /** Maximum global pour l’échelle des barres (évite de recalculer par page). */
  maxTotal?: number;
}) {
  const max = maxTotal ?? Math.max(...items.map((item) => item.total), 1);

  return (
    <ul className="space-y-3">
      {items.map((province, index) => {
        const width = Math.round((province.total / max) * 100);
        const activeRate =
          province.total > 0 ? Math.round((province.active / province.total) * 100) : 0;

        return (
          <li key={province.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 font-medium text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-700 ring-1 ring-inset ring-brand-100">
                  {startRank + index}
                </span>
                <span className="truncate">{province.name}</span>
                <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {province.code}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-slate-600">
                {formatNumber(province.total)}
                <span className="ml-1 text-[11px] text-emerald-600">({activeRate} % actifs)</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ProvinceRankingEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
      <MapPin className="h-8 w-8 text-slate-300" aria-hidden />
      Aucune donnée provinciale pour ce filtre.
    </div>
  );
}
