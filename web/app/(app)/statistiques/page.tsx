"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, UserCheck, Clock, CreditCard, MapPin } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { TerritorySelect } from "@/components/forms/territory-select";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Alert, PageLoader, Skeleton } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi, usePublicStructures } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { StatisticsCharts, StatisticsOverview } from "@/lib/types";
import { formatNumber, cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  pending: "#f59e0b",
  inactive: "#64748b",
  suspended: "#ce1126",
  archived: "#94a3b8",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-[var(--shadow-elevated)]">
      {label && <p className="mb-1 font-medium text-slate-700">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-slate-600">
          {entry.name} : <strong className="tabular-nums">{formatNumber(entry.value)}</strong>
        </p>
      ))}
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

  if (overview.loading && !overview.data) return <PageLoader />;
  if (overview.error) return <Alert tone="error">{overview.error}</Alert>;

  const kpis = overview.data?.kpis;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Statistiques" }]} />
      <PageHeader
        title="Statistiques"
        description={
          overview.data?.scope.province
            ? `Périmètre : ${overview.data.scope.province}`
            : "Vue nationale — agrégats membres, cartes et mobilisation"
        }
      />

      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
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
            <TerritorySelect value={territory} onChange={(value) => { setTerritory(value); setStructureId(""); }} />
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

      {kpis && (
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 xl:grid-cols-5")}>
          <KpiCard label="Membres total" value={kpis.members.total} icon={Users} tone="info" href="/membres" />
          <KpiCard label="Actifs" value={kpis.members.active} icon={UserCheck} tone="success" href="/membres?status=active" />
          <KpiCard label="En attente" value={kpis.members.pending} icon={Clock} tone="warning" href="/membres?status=pending" />
          <KpiCard label="Cartes actives" value={kpis.cards.active} icon={CreditCard} tone="info" href="/cartes" />
          <KpiCard label="Provinces couvertes" value={kpis.coverage.provinces} icon={MapPin} tone="neutral" href="/cartographie" />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Inscriptions" description="Tendance sur la période sélectionnée" />
          <CardBody className="h-72">
            {charts.loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.data?.registrations_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="total" name="Inscriptions" stroke="#0087d1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Répartition par statut" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.data?.by_status ?? []}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {(charts.data?.by_status ?? []).map((entry) => (
                    <Cell key={entry.key} fill={STATUS_COLORS[entry.key] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tranches d'âge" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data?.by_age_range ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#0087d1" name="Membres" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Professions" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data?.by_profession ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#00649c" name="Membres" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Répartition par sexe" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data?.by_gender ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#ce1126" name="Membres" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Mobilisation par type d'activité" />
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data?.by_activity ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" fill="#fad201" name="Activités" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
