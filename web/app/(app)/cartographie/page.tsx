"use client";

import { useMemo, useState } from "react";
import { ChevronRight, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { MapStatistics } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export default function MapPage() {
  return (
    <RequirePermission permission={PERMISSIONS.mapView}>
      <MapContent />
    </RequirePermission>
  );
}

function MapContent() {
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const config = useApi<{ provider: string; configured: boolean }>("/map/config");
  const stats = useApi<MapStatistics>("/map/statistics", {
    province_id: provinceId,
    city_id: cityId,
  });

  const selectedProvince = useMemo(
    () => stats.data?.provinces.find((p) => p.id === provinceId) ?? null,
    [stats.data?.provinces, provinceId],
  );

  const selectedCity = useMemo(
    () => stats.data?.cities?.find((c) => c.id === cityId) ?? null,
    [stats.data?.cities, cityId],
  );

  if (stats.loading && !stats.data) return <PageLoader />;
  if (stats.error) return <Alert tone="error">{stats.error}</Alert>;

  const provinces = stats.data?.provinces ?? [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Cartographie" }]} />
      <PageHeader
        title="Cartographie"
        description="Répartition agrégée des membres sur le territoire national. Aucune position individuelle n'est affichée."
      />

      {config.data && !config.data.configured && (
        <Alert tone="info">
          Aucune clé cartographique n&apos;est configurée. Les agrégats territoriaux restent disponibles.
        </Alert>
      )}

      <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 text-white">
        <CardBody className="relative p-6 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,210,1,0.12),transparent_55%)]" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-widest text-brand-200 uppercase">
                {selectedCity ? selectedCity.name : selectedProvince ? selectedProvince.name : "République Démocratique du Congo"}
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {formatNumber(selectedCity?.total ?? selectedProvince?.total ?? stats.data?.total ?? 0)}
              </p>
              <p className="mt-1 text-sm text-brand-100/90">membres enregistrés dans le périmètre</p>
              {selectedProvince && (
                <p className="mt-2 text-xs text-brand-200/80">
                  {formatNumber(selectedProvince.active)} actifs · {formatNumber(selectedProvince.total - selectedProvince.active)} autres statuts
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs backdrop-blur">
              <MapPin className="h-4 w-4 text-gold-400" />
              {provinces.length} provinces couvertes
            </div>
          </div>
          {(provinceId || cityId) && (
            <button
              type="button"
              onClick={() => {
                if (cityId) setCityId(null);
                else setProvinceId(null);
              }}
              className="relative mt-4 text-xs font-medium text-gold-300 hover:text-gold-200"
            >
              ← Revenir au niveau supérieur
            </button>
          )}
        </CardBody>
      </Card>

      {!provinceId && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {provinces.map((province) => (
            <button
              key={province.id}
              type="button"
              onClick={() => {
                setProvinceId(province.id);
                setCityId(null);
              }}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-[var(--shadow-elevated)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">{province.name}</p>
                  <p className="mt-2 text-3xl font-semibold text-brand-800 tabular-nums">
                    {formatNumber(province.total)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">membres</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-brand-500" />
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-700">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(province.active)} actifs
              </div>
            </button>
          ))}
        </div>
      )}

      {provinceId && stats.data?.cities && stats.data.cities.length > 0 && (
        <Card>
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.data.cities.map((city) => (
              <button
                key={city.id}
                type="button"
                onClick={() => setCityId(city.id)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition",
                  cityId === city.id
                    ? "border-brand-400 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300",
                )}
              >
                <p className="text-sm font-semibold text-slate-900">{city.name}</p>
                <p className="mt-1 text-xl font-semibold text-brand-700 tabular-nums">{formatNumber(city.total)}</p>
                <p className="text-[11px] text-slate-500">membres</p>
              </button>
            ))}
          </CardBody>
        </Card>
      )}

      {stats.data?.communes && stats.data.communes.length > 0 && (
        <Card>
          <CardBody>
            <p className="mb-3 text-sm font-medium text-slate-700">Communes / secteurs</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.data.communes.map((commune) => (
                <div key={commune.id} className="rounded-lg border border-slate-200 px-3 py-2.5">
                  <p className="text-sm font-medium">{commune.name}</p>
                  <p className="text-xs text-slate-500">{formatNumber(commune.total)} membres</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {provinces.length === 0 && <EmptyState title="Aucune donnée territoriale" />}
    </div>
  );
}
