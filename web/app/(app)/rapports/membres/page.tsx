"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Fingerprint, MapPin, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import {
  ReportFiltersBar,
  filtersToQuery,
} from "@/components/reports/report-filters-bar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { useApi, useDebounced } from "@/lib/hooks";
import {
  EMPTY_REPORT_FILTERS,
  type MembersReportResponse,
} from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

export default function MembersReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <MembersReport />
    </RequirePermission>
  );
}

function MembersReport() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_REPORT_FILTERS);
  const debouncedQ = useDebounced(filters.q);

  const query = useMemo(
    () => ({
      ...filtersToQuery({ ...filters, q: debouncedQ }),
      page,
      per_page: 20,
    }),
    [filters, debouncedQ, page],
  );

  const { data, loading, error } = useApi<MembersReportResponse>("/reports/members", query);

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Membres" },
        ]}
      />

      <DashboardAnimate>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Rapport des membres
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Liste par localisation — Province → Ville → District → Commune → Quartier → Avenue
            </p>
          </div>
          <ReportExportButtons filters={filters} />
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
          showRegistrationDates
          showStructure
        />

        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Card>
          <CardBody className="p-0">
            {loading ? (
              <TableSkeleton />
            ) : !data?.data.length ? (
              <EmptyState
                icon={Users}
                title="Aucun membre"
                description="Aucun membre ne correspond aux filtres sélectionnés."
              />
            ) : (
              <>
                <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                  {formatNumber(data.meta.total)} membre(s) — page {data.meta.current_page} /{" "}
                  {data.meta.last_page}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Membre</th>
                        <th className="px-4 py-3">Localisation</th>
                        <th className="px-4 py-3">Structure</th>
                        <th className="px-4 py-3">Inscription</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Carte</th>
                        <th className="px-4 py-3">Bio.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.data.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <Link
                              href={`/rapports/membres/${row.member_code}`}
                              className="font-medium text-brand-700 hover:underline"
                            >
                              {row.full_name}
                            </Link>
                            <p className="text-xs text-slate-500">{row.member_code}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="inline-flex items-start gap-1">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>
                                {[row.province, row.city, row.district, row.commune, row.quartier, row.avenue]
                                  .filter(Boolean)
                                  .join(" › ") || "—"}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.structure ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.joined_at ?? row.created_at?.slice(0, 10) ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={row.status === "active" ? "success" : "neutral"}>
                              {row.status_label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.card_status_label ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {row.biometric_enrolled ? (
                              <Fingerprint className="h-4 w-4 text-emerald-600" aria-label="Biométrie active" />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
