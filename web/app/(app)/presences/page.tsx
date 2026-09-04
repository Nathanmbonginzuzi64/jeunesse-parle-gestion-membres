"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  LayoutGrid,
  Percent,
  ScanLine,
  Table2,
  Users,
} from "lucide-react";
import { AttendanceHero } from "@/components/attendance/attendance-hero";
import { RequirePermission, Can } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { QuickLinkCard } from "@/components/dashboard/quick-link-card";
import { ActivityStatusBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { Activity, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

type ViewMode = "table" | "cards";

export default function AttendanceHubPage() {
  return (
    <RequirePermission permission={PERMISSIONS.attendanceView}>
      <AttendanceHub />
    </RequirePermission>
  );
}

function AttendanceHub() {
  const [view, setView] = useState<ViewMode>("table");
  const { data, loading, error } = useApi<Paginated<Activity>>("/activities/for-attendance", {
    per_page: 50,
  });

  const stats = useMemo(() => {
    const list = data?.data ?? [];
    const withAttendance = list.filter((a) => (a.participants_count ?? 0) > 0 || a.status === "completed" || a.status === "ongoing");
    const expected = list.reduce((sum, a) => sum + (a.participants_count ?? 0), 0);
    const present = list.reduce((sum, a) => sum + (a.attendances_count ?? 0), 0);
    const rates = list
      .filter((a) => (a.participants_count ?? 0) > 0)
      .map((a) => Math.round(((a.attendances_count ?? 0) / (a.participants_count ?? 1)) * 100));
    const averageRate = rates.length ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length) : 0;
    return {
      activitiesCount: withAttendance.length || list.length,
      expected,
      present,
      averageRate,
      list,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/presences", label: "Présences" }]} />

      <DashboardAnimate>
        <AttendanceHero
          activitiesCount={stats.activitiesCount}
          expected={stats.expected}
          present={stats.present}
          averageRate={stats.averageRate}
        />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Activités suivies" value={stats.activitiesCount} icon={ClipboardCheck} tone="info" href="/presences" />
          <KpiCard label="Participants attendus" value={stats.expected} icon={Users} tone="neutral" />
          <KpiCard label="Présences enregistrées" value={stats.present} icon={ScanLine} tone="success" />
          <KpiCard label="Taux moyen" value={`${stats.averageRate} %`} icon={Percent} tone="warning" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            href="/scan"
            icon={ScanLine}
            title="Scanner un membre"
            description="Enregistrer une présence via QR"
            tone="brand"
          />
          <Can permission={PERMISSIONS.activitiesView}>
            <QuickLinkCard
              href="/activites"
              icon={ClipboardCheck}
              title="Programme d'activités"
              description="Ouvrir une feuille de présence"
              tone="emerald"
            />
          </Can>
          <QuickLinkCard
            href="/verification"
            icon={Users}
            title="Vérifier une carte"
            description="Contrôle QR ou biométrie"
            tone="amber"
          />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={140}>
        <Card>
          <CardHeader
            title="Feuilles de présence"
            description="Taux de participation par activité"
            action={
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setView("table")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                      view === "table" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("cards")}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                      view === "cards" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Cartes
                  </button>
                </div>
                <Link href="/scan">
                  <Button size="sm">
                    <ScanLine className="h-4 w-4" />
                    Scanner
                  </Button>
                </Link>
              </div>
            }
          />
          <CardBody className="p-0">
            {error && (
              <div className="p-4">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            {loading && <TableSkeleton />}
            {!loading && data && data.data.length === 0 && <EmptyState title="Aucune activité" />}
            {!loading && data && data.data.length > 0 && view === "table" && (
              <Table>
                <thead>
                  <tr>
                    <Th>Activité</Th>
                    <Th>Statut</Th>
                    <Th>Attendus</Th>
                    <Th>Présents</Th>
                    <Th>Taux</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((activity) => {
                    const expected = activity.participants_count ?? 0;
                    const present = activity.attendances_count ?? 0;
                    const rate = expected ? Math.round((present / expected) * 100) : 0;
                    return (
                      <Tr key={activity.id}>
                        <Td>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(activity.starts_at)}</p>
                        </Td>
                        <Td>
                          <ActivityStatusBadge status={activity.status} label={activity.status_label} />
                        </Td>
                        <Td className="tabular-nums">{formatNumber(expected)}</Td>
                        <Td className="tabular-nums">{formatNumber(present)}</Td>
                        <Td>
                          <RateBadge rate={rate} />
                        </Td>
                        <Td>
                          <Link
                            href={`/presences/${activity.id}`}
                            className="text-sm font-medium text-brand-700 hover:underline"
                          >
                            Feuille
                          </Link>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
            {!loading && data && data.data.length > 0 && view === "cards" && (
              <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.data.map((activity) => {
                  const expected = activity.participants_count ?? 0;
                  const present = activity.attendances_count ?? 0;
                  const rate = expected ? Math.round((present / expected) * 100) : 0;
                  return (
                    <article
                      key={activity.id}
                      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-emerald-300 hover:shadow-[var(--shadow-elevated)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{activity.title}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(activity.starts_at)}</p>
                        </div>
                        <ActivityStatusBadge status={activity.status} label={activity.status_label} />
                      </div>
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Participation</span>
                          <span className="font-semibold tabular-nums text-emerald-700">{rate} %</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-400" : "bg-brand-500",
                            )}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          <span className="font-semibold tabular-nums text-slate-800">{formatNumber(present)}</span>
                          {" / "}
                          {formatNumber(expected)} présents
                        </p>
                      </div>
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <Link href={`/presences/${activity.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Gérer les présences
                          </Button>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </DashboardAnimate>
    </div>
  );
}

function RateBadge({ rate }: { rate: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        rate >= 80
          ? "bg-emerald-50 text-emerald-700"
          : rate >= 50
            ? "bg-amber-50 text-amber-700"
            : "bg-slate-100 text-slate-600",
      )}
    >
      {rate} %
    </span>
  );
}
