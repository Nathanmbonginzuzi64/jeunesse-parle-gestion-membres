"use client";

import { ArrowLeft, Building2, ChevronRight, Home, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export function TerritoryBreadcrumb({
  provinceName,
  cityName,
  onReset,
  onBackProvince,
}: {
  provinceName: string | null;
  cityName: string | null;
  onReset: () => void;
  onBackProvince: () => void;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-[var(--shadow-card)]">
      <button
        type="button"
        onClick={onReset}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition",
          !provinceName ? "font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50",
        )}
      >
        <Home className="h-3.5 w-3.5" />
        RDC
      </button>

      {provinceName && (
        <>
          <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
          <button
            type="button"
            onClick={onBackProvince}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 transition",
              provinceName && !cityName
                ? "font-semibold text-brand-700"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            {provinceName}
          </button>
        </>
      )}

      {cityName && (
        <>
          <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-700">
            <Building2 className="h-3.5 w-3.5" />
            {cityName}
          </span>
        </>
      )}

      {(provinceName || cityName) && (
        <button
          type="button"
          onClick={cityName ? onBackProvince : onReset}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Niveau supérieur
        </button>
      )}
    </nav>
  );
}
