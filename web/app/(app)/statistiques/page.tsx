"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  CalendarRange,
  CreditCard,
  Filter,
  GraduationCap,
  MapPin,
  PieChart as PieChartIcon,
  RotateCcw,
  ScanLine,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  VenusAndMars,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TerritorySelect } from "@/components/forms/territory-select";
import { ChartCard } from "@/components/statistics/chart-card";
import { ProvinceRanking, ProvinceRankingEmpty } from "@/components/statistics/province-ranking";
import { StatisticsHero } from "@/components/statistics/statistics-hero";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi, usePublicStructures } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { StatisticsCharts, StatisticsOverview } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  pending: "#f59e0b",
  inactive: "#64748b",
  suspended: "#ce1126",
  archived: "#94a3b8",
};

const PIE_FALLBACK = ["#0087d1", "#00649c", "#fad201", "#ce1126", "#64748b"];

const GENDER_COLORS: Record<string, string> = {
  M: "#0087d1",
  F: "#ce1126",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-[var(--shadow-elevated)]">
      {label && <p className="mb-1 font-medium text-slate-700">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-slate-600">
          {entry.color && (
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          )}
          {entry.name} : <strong className="tabular-nums">{formatNumber(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 rounded-card" />
      <Skeleton className="h-24 rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-card lg:col-span-2" />
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

export default function StatisticsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <StatisticsContent />
    </RequirePermission>
  );
}

function StatisticsContent() {
  const [period, setPeriod] = useState("30d");
  const [status, setStatus] = useState("");
  const [structureId, setStructureId] = useState<number | "">("");
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });

  const structures = usePublicStructures(territory.province_id, territory.city_id);

  const filters = useMemo(
    () => ({
      period,
      status: status || undefined,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      structure_id: structureId || undefined,
    }),
    [period, status, territory, structureId],
  );

  const overview = useApi<StatisticsOverview>("/statistics", filters);
  const charts = useApi<StatisticsCharts>("/statistics/charts", filters);

  const hasActiveFilters =
    status !== "" ||
    structureId !== "" ||
    territory.province_id !== null ||
    territory.city_id !== null ||
    territory.commune_id !== null;

  function resetFilters() {
    setPeriod("30d");
    setStatus("");
    setStructureId("");
    setTerritory({
      province_id: null,
      city_id: null,
      district_id: null,
      commune_id: null,
      zone_id: null,
    });
  }

  if (overview.loading && !overview.data) return <StatisticsSkeleton />;
  if (overview.error) return <Alert tone="error">{overview.error}</Alert>;

  const kpis = overview.data?.kpis;
  const recent = overview.data?.recent ?? [];
  const provinces = charts.data?.by_province ?? [];
  const topSkills = charts.data?.top_skills ?? [];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Statistiques" }]} />

      <DashboardAnimate>
        <StatisticsHero scope={overview.data?.scope} kpis={kpis} period={period} />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <Card className="overflow-hidden border-brand-100/80">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-brand-600" aria-hidden />
                Filtres d&apos;analyse
              </span>
            }
            description="Affinez les agrégats par période, statut, territoire ou structure"
            action={
              hasActiveFilters ? (
                <Button type="button" size="sm" variant="ghost" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser
                </Button>
              ) : undefined
            }
          />
          <CardBody className="flex flex-wrap items-end gap-3 bg-gradient-to-b from-brand-50/40 to-transparent pt-4">
            <Select
              label="Période"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: "7d", label: "7 derniers jours" },
                { value: "30d", label: "30 derniers jours" },
                { value: "90d", label: "90 derniers jours" },
                { value: "12m", label: "12 mois" },
              ]}
              wrapperClassName="min-w-[10rem]"
            />
            <Select
              label="Statut membre"
              placeholder="Tous"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "active", label: "Actifs" },
                { value: "pending", label: "En attente" },
                { value: "suspended", label: "Suspendus" },
                { value: "inactive", label: "Inactifs" },
              ]}
              wrapperClassName="min-w-[10rem]"
            />
            <div className="min-w-[16rem] flex-1">
              <TerritorySelect
                value={territory}
                onChange={(value) => {
                  setTerritory(value);
                  setStructureId("");
                }}
              />
            </div>
            <Select
              label="Structure"
              placeholder="Toutes"
              value={structureId}
              onChange={(e) => setStructureId(e.target.value ? Number(e.target.value) : "")}
              options={structures.map((s) => ({ value: s.id, label: s.name }))}
              wrapperClassName="min-w-[12rem]"
            />
          </CardBody>
        </Card>
      </DashboardAnimate>

      {kpis && (
        <DashboardAnimate delay={100}>
          <DashboardSection
            icon={BarChart3}
            title="Vue d'ensemble"
            description="Indicateurs clés sur le périmètre sélectionné"
            tone="brand"
            action={
              <Link href="/membres" className="text-xs font-medium text-brand-700 hover:underline">
                Voir les membres →
              </Link>
            }
          >
            <div className={cn(dashboardCardGrid, "sm:grid-cols-2 xl:grid-cols-4")}>
              <KpiCard
                label="Membres total"
                value={kpis.members.total}
                icon={Users}
                tone="info"
                href="/membres"
                hint="tous statuts"
              />
              <KpiCard
                label="Actifs"
                value={kpis.members.active}
                icon={UserCheck}
                tone="success"
                href="/membres?status=active"
              />
              <KpiCard
                label="Nouveaux (30 j)"
                value={kpis.members.new_last_30_days}
                icon={TrendingUp}
                tone="info"
                trend={`+${formatNumber(kpis.members.new_this_month)} ce mois`}
              />
              <KpiCard
                label="Cartes actives"
                value={kpis.cards.active}
                icon={CreditCard}
                tone="success"
                href="/cartes"
                hint={`${formatNumber(kpis.cards.issued_this_month)} émises ce mois`}
              />
              <KpiCard
                label="Vérifications (30 j)"
                value={kpis.verifications.last_30_days}
                icon={ScanLine}
                tone="neutral"
                href="/verification"
              />
              <KpiCard
                label="Activités"
                value={kpis.activities.total}
                icon={Activity}
                tone="warning"
                href="/activites"
                hint={`${formatNumber(kpis.activities.upcoming)} à venir`}
              />
              <KpiCard
                label="Provinces"
                value={kpis.coverage.provinces}
                icon={MapPin}
                tone="info"
                href="/cartographie"
                hint={`${formatNumber(kpis.coverage.cities)} villes`}
              />
              <KpiCard
                label="Structures"
                value={kpis.coverage.structures}
                icon={Users}
                tone="neutral"
                href="/structures"
              />
            </div>
          </DashboardSection>
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={180}>
        <DashboardSection
          className="mt-2"
          icon={TrendingUp}
          title="Tendances & statuts"
          description="Évolution des inscriptions et répartition des effectifs"
          tone="emerald"
        >
          <div className="grid gap-6 lg:grid-cols-5">
            <ChartCard
              className="lg:col-span-3"
              title="Inscriptions"
              description="Tendance sur la période sélectionnée"
              icon={CalendarRange}
              tone="brand"
              loading={charts.loading}
              height="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={charts.data?.registrations_trend ?? []}
                  margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="statsRegGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0087d1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0087d1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#667085" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#667085" }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Inscriptions"
                    stroke="#0087d1"
                    strokeWidth={2.5}
                    fill="url(#statsRegGradient)"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#00649c"
                    strokeWidth={0}
                    dot={false}
                    activeDot={{ r: 5, fill: "#0087d1", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              className="lg:col-span-2"
              title="Répartition par statut"
              icon={PieChartIcon}
              tone="emerald"
              loading={charts.loading}
              height="h-64"
              footer={
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                  {(charts.data?.by_status ?? []).map((entry, index) => (
                    <li key={entry.key} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background:
                              STATUS_COLORS[entry.key] ??
                              PIE_FALLBACK[index % PIE_FALLBACK.length],
                          }}
                        />
                        <span className="truncate">{entry.label}</span>
                      </span>
                      <span className="shrink-0 tabular-nums font-medium text-slate-800">
                        {formatNumber(entry.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              }
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.data?.by_status ?? []}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {(charts.data?.by_status ?? []).map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={
                          STATUS_COLORS[entry.key] ?? PIE_FALLBACK[index % PIE_FALLBACK.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={260}>
        <DashboardSection
          className="mt-2"
          icon={Users}
          title="Profil des membres"
          description="Démographie, parcours et compétences"
          tone="amber"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Tranches d'âge"
              icon={Users}
              tone="brand"
              loading={charts.loading}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.data?.by_age_range ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="Membres" fill="#0087d1" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Répartition par sexe" icon={VenusAndMars} tone="rose" loading={charts.loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.data?.by_gender ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="Membres" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {(charts.data?.by_gender ?? []).map((entry) => (
                      <Cell key={entry.key} fill={GENDER_COLORS[entry.key] ?? "#0087d1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Professions" icon={Briefcase} tone="slate" loading={charts.loading}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.data?.by_profession ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={108} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="Membres" fill="#00649c" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Compétences phares" icon={Sparkles} tone="gold" loading={charts.loading}>
              {topSkills.length > 0 ? (
                <ul className="flex h-full flex-col justify-center gap-3">
                  {topSkills.map((skill, index) => {
                    const max = topSkills[0]?.total ?? 1;
                    const width = Math.round((skill.total / max) * 100);
                    return (
                      <li key={skill.label}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="flex items-center gap-2 font-medium text-slate-800">
                            <GraduationCap className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                            {skill.label}
                          </span>
                          <span className="tabular-nums text-slate-600">{formatNumber(skill.total)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-brand-500"
                            style={{ width: `${width}%`, opacity: 1 - index * 0.08 }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Aucune compétence enregistrée.
                </div>
              )}
            </ChartCard>
          </div>
        </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={340}>
        <DashboardSection
          className="mt-2"
          icon={MapPin}
          title="Territoire & mobilisation"
          description="Couverture géographique et activités par type"
          tone="slate"
          action={
            <Link href="/cartographie" className="text-xs font-medium text-brand-700 hover:underline">
              Cartographie →
            </Link>
          }
        >
          <div className="grid gap-6 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-1"
              title="Top provinces"
              description="Classement par effectif"
              icon={MapPin}
              tone="brand"
              loading={charts.loading}
              height="min-h-[20rem]"
            >
              {provinces.length > 0 ? (
                <ProvinceRanking items={provinces} />
              ) : (
                <ProvinceRankingEmpty />
              )}
            </ChartCard>

            <ChartCard
              className="xl:col-span-1"
              title="Mobilisation"
              description="Activités par type"
              icon={Activity}
              tone="amber"
              loading={charts.loading}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={charts.data?.by_activity ?? []}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="total" name="Activités" fill="#fad201" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <Card className="xl:col-span-1 overflow-hidden">
              <CardHeader
                title="Activité récente"
                description="Derniers événements du périmètre"
              />
              <CardBody className="p-0">
                {recent.length > 0 ? (
                  <RecentActivity items={recent} />
                ) : (
                  <p className="px-5 py-8 text-center text-sm text-slate-500">
                    Aucune activité récente.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </DashboardSection>
      </DashboardAnimate>
    </div>
  );
}
