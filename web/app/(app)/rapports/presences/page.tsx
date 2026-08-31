"use client";

import { useMemo, useState } from "react";
import { UserCheck } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import {
  ReportFiltersBar,
  filtersToQuery,
} from "@/components/reports/report-filters-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import {
  EMPTY_REPORT_FILTERS,
  type AttendanceReportResponse,
} from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

export default function AttendanceReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <AttendanceReport />
    </RequirePermission>
  );
}

function AttendanceReport() {
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS);

  const query = useMemo(() => filtersToQuery(filters), [filters]);

  const { data, loading, error } = useApi<AttendanceReportResponse>("/reports/attendance", query);

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Présences" },
        ]}
      />

      <DashboardAnimate>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Rapport des présences</h1>
        <p className="mt-1 text-sm text-slate-600">
          Suivi global de participation et analyse par type d&apos;activité.
        </p>
      </DashboardAnimate>

      <div className="mt-4 space-y-4">
        <ReportFiltersBar
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(EMPTY_REPORT_FILTERS)}
          showSearch={false}
          showStatus={false}
          showPeriod={false}
          showTerritory={false}
          showActivityDates
        />

        {error ? <Alert tone="danger">{error}</Alert> : null}

        {loading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div className={dashboardCardGrid}>
              <KpiCard
                label="Membres actifs"
                value={formatNumber(data.global.active_members)}
                icon={UserCheck}
              />
              <KpiCard
                label="Présences enregistrées"
                value={formatNumber(data.global.total_records)}
                icon={UserCheck}
              />
              <KpiCard
                label="Présents"
                value={formatNumber(data.global.present)}
                icon={UserCheck}
              />
              <KpiCard
                label="Taux participation"
                value={`${data.global.participation_rate}%`}
                icon={UserCheck}
              />
            </div>

            <Card>
              <CardHeader title="Par type d'activité" />
              <CardBody className="p-0">
                {data.by_activity_type.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">Aucune donnée de présence.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Activités</th>
                          <th className="px-4 py-3">Présences</th>
                          <th className="px-4 py-3">Présents</th>
                          <th className="px-4 py-3">Taux</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.by_activity_type.map((row) => (
                          <tr key={row.type}>
                            <td className="px-4 py-3 font-medium">{row.type_label}</td>
                            <td className="px-4 py-3">{formatNumber(row.activities_count)}</td>
                            <td className="px-4 py-3">{formatNumber(row.attendances_count)}</td>
                            <td className="px-4 py-3">{formatNumber(row.present_count)}</td>
                            <td className="px-4 py-3">{row.rate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
