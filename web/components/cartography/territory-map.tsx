"use client";

import { cn, formatNumber } from "@/lib/utils";
import type { ProvinceStat } from "@/lib/types";

const LAT_MIN = -13;
const LAT_MAX = 5;
const LNG_MIN = 12;
const LNG_MAX = 31;

function project(lat: number, lng: number, w: number, h: number) {
  return {
    x: ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * w,
    y: ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h,
  };
}

function bubbleRadius(total: number, max: number) {
  const min = 10;
  const maxR = 36;
  if (max <= 0) return min;
  return min + Math.sqrt(total / max) * (maxR - min);
}

export function TerritoryMap({
  provinces,
  selectedId,
  onSelect,
}: {
  provinces: ProvinceStat[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const w = 520;
  const h = 420;
  const maxTotal = Math.max(...provinces.map((p) => p.total), 1);
  const withCoords = provinces.filter((p) => p.latitude != null && p.longitude != null);

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-200/60 bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,135,209,0.25),transparent_50%)]" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(250,210,1,0.08),transparent_45%)]" aria-hidden />

      <div className="relative border-b border-white/10 px-4 py-3">
        <p className="text-xs font-medium text-brand-100">Carte des effectifs — RDC</p>
        <p className="text-[10px] text-brand-200/70">Cliquez sur une province · Aucune géolocalisation individuelle</p>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="relative mx-auto block w-full max-w-2xl" role="img" aria-label="Carte des provinces">
        <defs>
          <filter id="mapGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grille stylisée */}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={(h / 8) * i}
            x2={w}
            y2={(h / 8) * i}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={(w / 10) * i}
            y1={0}
            x2={(w / 10) * i}
            y2={h}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Silhouette simplifiée RDC */}
        <path
          d="M 80 120 Q 120 80 180 90 T 280 70 Q 340 60 400 100 T 460 180 Q 480 240 450 300 T 380 360 Q 300 390 220 370 T 120 320 Q 60 260 70 200 Z"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
        />

        {withCoords.map((province) => {
          const { x, y } = project(province.latitude!, province.longitude!, w, h);
          const r = bubbleRadius(province.total, maxTotal);
          const selected = selectedId === province.id;

          return (
            <g
              key={province.id}
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => onSelect(province.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(province.id);
              }}
            >
              <circle
                cx={x}
                cy={y}
                r={r + 4}
                fill={selected ? "rgba(250,210,1,0.35)" : "rgba(0,135,209,0.2)"}
                filter={selected ? "url(#mapGlow)" : undefined}
              />
              <circle
                cx={x}
                cy={y}
                r={r}
                className={cn(
                  "transition-colors",
                  selected ? "fill-gold-500" : "fill-brand-500 hover:fill-brand-400",
                )}
                stroke={selected ? "#fff" : "rgba(255,255,255,0.5)"}
                strokeWidth={selected ? 2 : 1}
              />
              <text
                x={x}
                y={y - r - 6}
                textAnchor="middle"
                className="fill-white text-[10px] font-semibold"
                style={{ fontSize: 10 }}
              >
                {province.code}
              </text>
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                className="fill-white text-[9px] font-bold tabular-nums"
                style={{ fontSize: 9 }}
              >
                {formatNumber(province.total)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-[10px] text-brand-100/80">
        <span>Taille des cercles ∝ effectif provincial</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Province
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-gold-500" /> Sélectionnée
          </span>
        </span>
      </div>
    </div>
  );
}
