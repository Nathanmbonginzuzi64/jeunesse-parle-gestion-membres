"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CalendarDays } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { ActivitiesPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import {
  ReportFiltersBar,
  filtersToQuery,
} from "@/components/reports/report-filters-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { useApi, useDebounced } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import {
  EMPTY_REPORT_FILTERS,
  type ActivitiesReportResponse,
} from "@/lib/reports/api-types";
import { fetchAllReportPages } from "@/lib/reports/fetch-all-pages";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default function ActivitiesReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <ActivitiesReport />
    </RequirePermission>
  );
}

function ActivitiesReport() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS);
  const debouncedQ = useDebounced(filters.q);

  const query = useMemo(
    () => ({ ...filtersToQuery({ ...filters, q: debouncedQ }), page, per_page: 20 }),
    [filters, debouncedQ, page],
  );

  const { data, loading, error } = useApi<ActivitiesReportResponse>("/reports/activities", query);

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Activités" },
        ]}
      />

      <DashboardAnimate>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Rapport des activités</h1>
            <p className="mt-1 text-sm text-slate-600">
              Informations générales, participants et présences par activité.
            </p>
          </div>
          <ReportPdfExportButton
            reportId="activites"
            disabled={!data?.data.length}
            onPrepare={async () => {
              const full = await fetchAllReportPages<
                ActivitiesReportResponse["data"][number]
              >("/reports/activities", filtersToQuery({ ...filters, q: debouncedQ }));
              return (
                <ActivitiesPdfDocument
                  data={full as ActivitiesReportResponse}
                  generatedBy={user?.name}
                  filters={filters}
                />
              );
            }}
          />
        </div>
      </DashboardAnimate>

      <div className="mt-4 space-y-4">
        <ReportFiltersBar
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setPage(1);
          }}
          onReset={() => {
            setFilters(EMPTY_REPORT_FILTERS);
            setPage(1);
          }}
          showStatus={false}
          showPeriod={false}
          showActivityDates
          showStructure
        />

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Card>
          <CardBody className="p-0">
            {loading ? (
              <TableSkeleton />
            ) : !data?.data.length ? (
              <EmptyState
                icon={Activity}
                title="Aucune activité"
                description="Aucune activité ne correspond aux filtres."
              />
            ) : (
              <>
                <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                  {formatNumber(data.meta.total)} activité(s)
                </p>
                <div className="divide-y divide-slate-100">
                  {data.data.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-4"
                    >
                      <div>
                        <Link
                          href={`/activites/${row.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {row.code} · {row.type_label}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {row.starts_at ? formatDateTime(row.starts_at) : "—"}
                          {row.location ? ` · ${row.location}` : ""}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[row.province, row.city, row.commune].filter(Boolean).join(" › ")}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <p>{formatNumber(row.participants_count)} participants</p>
                        <p>{formatNumber(row.attendances_count)} présences</p>
                        <p className="text-xs text-slate-500">{row.organizer ?? "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  onPageChange={setPage}
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
