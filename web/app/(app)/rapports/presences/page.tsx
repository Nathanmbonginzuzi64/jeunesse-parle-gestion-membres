"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Percent, UserCheck, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { AttendancePdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import {
  ReportFiltersBar,
  filtersToQuery,
} from "@/components/reports/report-filters-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import {
  EMPTY_REPORT_FILTERS,
  type AttendanceReportResponse,
} from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCompactCount, formatNumber } from "@/lib/utils";

export default function AttendanceReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <AttendanceReport />
    </RequirePermission>
  );
}

function AttendanceReport() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS);

  const query = useMemo(() => filtersToQuery(filters), [filters]);

  const { data, loading, error } = useApi<AttendanceReportResponse>("/reports/attendance", query);

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Présences" },
        ]}
      />

      <ReportPageHeader
        icon={UserCheck}
        title="Rapport des présences"
        description="Suivi global de participation et analyse par type d'activité."
        actions={
          <ReportPdfExportButton
            reportId="presences"
            disabled={!data}
            onPrepare={async () => {
              if (!data) throw new Error("Données indisponibles.");
              return (
                <AttendancePdfDocument data={data} generatedBy={user?.name} filters={filters} />
              );
            }}
          />
        }
      />

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
              value={formatCompactCount(data.global.active_members)}
              icon={Users}
              tone="info"
            />
            <KpiCard
              label="Présences enregistrées"
              value={formatCompactCount(data.global.total_records)}
              icon={UserCheck}
              tone="neutral"
            />
            <KpiCard
              label="Présents"
              value={formatCompactCount(data.global.present)}
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              label="Taux participation"
              value={`${data.global.participation_rate}%`}
              icon={Percent}
              tone="warning"
            />
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader
              title="Par type d'activité"
              description={`${data.by_activity_type.length} type(s)`}
            />
            <CardBody className="p-0">
              {data.by_activity_type.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="Aucune donnée"
                  description="Aucune donnée de présence pour la période."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
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
                        <tr key={row.type} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3 font-medium text-slate-900">{row.type_label}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(row.activities_count)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(row.attendances_count)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatNumber(row.present_count)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
                              {row.rate}%
                            </span>
                          </td>
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
  );
}
