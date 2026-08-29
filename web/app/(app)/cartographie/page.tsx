"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarChart3, Building2, Layers, MapPin, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DeviceLocationPanel } from "@/components/cartography/device-location-panel";
import { MapHero } from "@/components/cartography/map-hero";
import { ProvinceGrid } from "@/components/cartography/province-grid";
import { TerritoryBreadcrumb } from "@/components/cartography/territory-breadcrumb";
import { TerritoryMap } from "@/components/cartography/territory-map";
import { GoogleTerritoryMap } from "@/components/cartography/google-territory-map";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { ProvinceRanking } from "@/components/statistics/province-ranking";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Pagination } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import { useDeviceLocation } from "@/lib/hooks/use-device-location";
import { findNearestProvince } from "@/lib/geo";
import { GOOGLE_MAPS_API_KEY } from "@/lib/maps-config";
import { PERMISSIONS } from "@/lib/permissions";
import type { MapStatistics } from "@/lib/types";
import { useClientPagination } from "@/lib/use-client-pagination";
import { cn, formatNumber } from "@/lib/utils";

function MapSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-card" />
      <Skeleton className="h-96 rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-card" />
        ))}
      </div>
    </div>
  );
}

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
  const device = useDeviceLocation();
  const config = useApi<{ provider: string; configured: boolean; api_key?: string | null }>("/map/config");
  const stats = useApi<MapStatistics>("/map/statistics", {
    province_id: provinceId,
    city_id: cityId,
  });

  const mapsApiKey = config.data?.api_key || GOOGLE_MAPS_API_KEY;
  const mapsConfigured = Boolean(mapsApiKey);

  const provinces = stats.data?.provinces ?? [];
  const nationalTotal = stats.data?.total ?? 0;

  const rankedProvinces = useMemo(
    () => [...provinces].sort((a, b) => b.total - a.total),
    [provinces],
  );
  const rankingPage = useClientPagination(rankedProvinces, 5, rankedProvinces.length);
  const rankingMax = Math.max(...rankedProvinces.map((item) => item.total), 1);

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.id === provinceId) ?? null,
    [provinces, provinceId],
  );

  const selectedCity = useMemo(
    () => stats.data?.cities?.find((c) => c.id === cityId) ?? null,
    [stats.data?.cities, cityId],
  );

  const activeCount =
    selectedCity != null
      ? Math.round(selectedCity.total * 0.82)
      : selectedProvince?.active ?? provinces.reduce((sum, p) => sum + p.active, 0);

  const topProvince = useMemo(
    () => [...provinces].sort((a, b) => b.total - a.total)[0],
    [provinces],
  );

  const nearestProvince = useMemo(() => {
    if (!device.location) return null;
    return findNearestProvince(device.location.latitude, device.location.longitude, provinces);
  }, [device.location, provinces]);

  function selectProvince(id: number) {
    setProvinceId(id);
    setCityId(null);
  }

  function resetTerritory() {
    setProvinceId(null);
    setCityId(null);
  }

  if (stats.loading && !stats.data) return <MapSkeleton />;
  if (stats.error) return <Alert tone="error">{stats.error}</Alert>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Cartographie" }]} />

      <DashboardAnimate>
        <MapHero
          total={nationalTotal}
          provinces={provinces}
          selectedProvince={selectedProvince}
          selectedCity={selectedCity}
          activeCount={activeCount}
        />
      </DashboardAnimate>

      {!mapsConfigured && (
        <Alert tone="info">
          Carte locale active (sans Google Maps). Activez votre position admin ci-dessous — seule
          votre position est affichée, jamais celle des membres. Pour Google Maps, ajoutez une clé
          API dans la configuration.
        </Alert>
      )}

      <DashboardAnimate delay={40}>
        <DeviceLocationPanel
          enabled={device.enabled}
          location={device.location}
          status={device.status}
          error={device.error}
          inRdc={device.inRdc}
          onToggle={device.toggle}
          onRefresh={device.refresh}
          nearestProvince={nearestProvince?.name}
          onFocusProvince={
            nearestProvince ? () => selectProvince(nearestProvince.id) : undefined
          }
        />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <TerritoryBreadcrumb
          provinceName={selectedProvince?.name ?? null}
          cityName={selectedCity?.name ?? null}
          onReset={resetTerritory}
          onBackProvince={() => setCityId(null)}
        />
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <DashboardSection
          icon={MapPin}
          title="Carte interactive"
          description="Répartition des effectifs par province — cliquez pour explorer"
          tone="brand"
          action={
            <Link href="/statistiques" className="text-xs font-medium text-brand-700 hover:underline">
              Voir les statistiques →
            </Link>
          }
        >
          {mapsConfigured ? (
            <GoogleTerritoryMap
              provinces={provinces}
              selectedId={provinceId}
              onSelect={selectProvince}
              deviceLocation={device.enabled ? device.location : null}
              apiKey={mapsApiKey}
            />
          ) : (
            <TerritoryMap
              provinces={provinces}
              selectedId={provinceId}
              onSelect={selectProvince}
              deviceLocation={device.enabled ? device.location : null}
            />
          )}
        </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={160}>
        <DashboardSection
          icon={Layers}
          title="Indicateurs territoriaux"
          description="Vue agrégée au niveau national"
          tone="slate"
        >
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
            <KpiCard
              label="Membres (national)"
              value={nationalTotal}
              icon={Users}
              tone="info"
              href="/membres"
            />
            <KpiCard
              label="Provinces couvertes"
              value={provinces.length}
              icon={MapPin}
              tone="info"
            />
            <KpiCard
              label="Province leader"
              value={topProvince?.name ?? "—"}
              icon={BarChart3}
              tone="success"
              hint={topProvince ? `${formatNumber(topProvince.total)} membres` : undefined}
            />
            <KpiCard
              label="Actifs (estim.)"
              value={provinces.reduce((s, p) => s + p.active, 0)}
              icon={Users}
              tone="success"
            />
          </div>
        </DashboardSection>
      </DashboardAnimate>

      {!provinceId && provinces.length > 0 && (
        <DashboardAnimate delay={220}>
          <DashboardSection
            icon={Building2}
            title="Provinces"
            description="Classement et exploration par entité territoriale"
            tone="emerald"
            action={
              <Link href="/structures" className="text-xs font-medium text-brand-700 hover:underline">
                Gérer les structures →
              </Link>
            }
          >
            <ProvinceGrid
              provinces={provinces}
              nationalTotal={nationalTotal}
              selectedId={provinceId}
              onSelect={selectProvince}
            />
          </DashboardSection>
        </DashboardAnimate>
      )}

      {provinceId && stats.data?.cities && stats.data.cities.length > 0 && (
        <DashboardAnimate delay={220}>
          <DashboardSection
            icon={Building2}
            title={`Villes — ${selectedProvince?.name}`}
            description="Sélectionnez une ville pour affiner le périmètre"
            tone="amber"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.data.cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => setCityId(city.id)}
                  className={cn(
                    "rounded-xl border px-4 py-4 text-left transition-all",
                    cityId === city.id
                      ? "border-brand-400 bg-brand-50 shadow-[var(--shadow-card)] ring-2 ring-brand-100"
                      : "border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm",
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {city.type}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{city.name}</p>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-brand-700">
                    {formatNumber(city.total)}
                  </p>
                  <p className="text-[11px] text-slate-500">membres enregistrés</p>
                </button>
              ))}
            </div>
          </DashboardSection>
        </DashboardAnimate>
      )}

      {stats.data?.communes && stats.data.communes.length > 0 && (
        <DashboardAnimate delay={280}>
          <Card>
            <CardHeader
              title="Communes & secteurs"
              description={selectedCity ? `Détail — ${selectedCity.name}` : "Découpage local"}
            />
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.data.communes.map((commune) => (
                  <div
                    key={commune.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/30"
                  >
                    <p className="text-sm font-semibold text-slate-900">{commune.name}</p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-brand-700">
                      {formatNumber(commune.total)}
                    </p>
                    <p className="text-[11px] text-slate-500">membres</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </DashboardAnimate>
      )}

      {!provinceId && provinces.length > 0 && (
        <DashboardAnimate delay={340}>
          <Card className="overflow-hidden">
            <CardHeader title="Classement provincial" description="Top effectifs par province" />
            <CardBody>
              <ProvinceRanking
                items={rankingPage.slice}
                startRank={(rankingPage.page - 1) * rankingPage.perPage + 1}
                maxTotal={rankingMax}
              />
            </CardBody>
            {rankingPage.total > 0 && (
              <Pagination
                page={rankingPage.page}
                lastPage={rankingPage.lastPage}
                total={rankingPage.total}
                perPage={rankingPage.perPage}
                onChange={rankingPage.setPage}
                label="provinces"
              />
            )}
          </Card>
        </DashboardAnimate>
      )}

      {provinces.length === 0 && <EmptyState title="Aucune donnée territoriale" />}
    </div>
  );
}
