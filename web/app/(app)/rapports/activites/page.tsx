"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CalendarDays, MapPin, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActivitiesPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import {
  ReportFiltersBar,
  filtersToQuery,
} from "@/components/reports/report-filters-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Activités" },
        ]}
      />

      <ReportPageHeader
        icon={Activity}
        title="Rapport des activités"
        description="Informations générales, participants et présences par activité."
        actions={
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
        }
      />

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

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader
          title="Activités"
          description={
            data?.meta
              ? `${formatNumber(data.meta.total)} résultat(s)`
              : "Liste filtrée et paginée"
          }
        />
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
              <div className="divide-y divide-slate-100">
                {data.data.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/activites/${row.id}`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          {row.title}
                        </Link>
                        <Badge tone="info">{row.type_label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{row.code}</p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        {row.starts_at ? formatDateTime(row.starts_at) : "—"}
                      </p>
                      {(row.location || row.province || row.city || row.commune) && (
                        <p className="mt-1 inline-flex items-start gap-1.5 text-xs text-slate-500">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span>
                            {[row.location, row.province, row.city, row.commune]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-right sm:flex-col sm:items-end">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-100">
                        <Users className="h-3.5 w-3.5" />
                        {formatNumber(row.participants_count)} participants
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
                        {formatNumber(row.attendances_count)} présences
                      </span>
                      <p className="text-xs text-slate-500">{row.organizer ?? "—"}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination
                page={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                perPage={data.meta.per_page}
                onChange={setPage}
                label="activités"
              />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
