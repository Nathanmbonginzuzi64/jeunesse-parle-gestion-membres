"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { CardsPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CardStatusBadge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { CardsReportResponse } from "@/lib/reports/api-types";
import { fetchAllReportPages } from "@/lib/reports/fetch-all-pages";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

export default function CardsReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <CardsReport />
    </RequirePermission>
  );
}

function CardsReport() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error } = useApi<CardsReportResponse>("/reports/cards", {
    page,
    per_page: 20,
  });

  const summary = data?.summary;

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Cartes" },
        ]}
      />

      <DashboardAnimate>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Rapport des cartes</h1>
            <p className="mt-1 text-sm text-slate-600">
              Vue globale et détail par membre — actives, expirées, suspendues, perdues, remplacées.
            </p>
          </div>
          <ReportPdfExportButton
            reportId="cartes"
            disabled={!data?.data.length}
            onPrepare={async () => {
              const full = await fetchAllReportPages<
                CardsReportResponse["data"][number],
                { summary: CardsReportResponse["summary"]; generated_at: string }
              >("/reports/cards", {});
              return <CardsPdfDocument data={full as CardsReportResponse} generatedBy={user?.name} />;
            }}
          />
        </div>
      </DashboardAnimate>

      {summary ? (
        <div className={dashboardCardGrid}>
          <KpiCard label="Total cartes" value={formatNumber(summary.total)} icon={CreditCard} />
          <KpiCard label="Actives" value={formatNumber(summary.active)} icon={CreditCard} />
          <KpiCard label="Expirées" value={formatNumber(summary.expired)} icon={CreditCard} />
          <KpiCard label="Suspendues" value={formatNumber(summary.suspended)} icon={CreditCard} />
          <KpiCard label="Perdues" value={formatNumber(summary.lost)} icon={CreditCard} />
          <KpiCard label="Remplacées" value={formatNumber(summary.replaced)} icon={CreditCard} />
        </div>
      ) : null}

      <Card className="mt-4">
        <CardBody className="p-0">
          {error ? (
            <Alert tone="danger" className="m-4">
              {error}
            </Alert>
          ) : loading ? (
            <TableSkeleton />
          ) : !data?.data.length ? (
            <EmptyState icon={CreditCard} title="Aucune carte" description="Aucune carte émise." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Membre</th>
                      <th className="px-4 py-3">N° carte</th>
                      <th className="px-4 py-3">Émission</th>
                      <th className="px-4 py-3">Expiration</th>
                      <th className="px-4 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.data.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          {row.member ? (
                            <Link
                              href={`/rapports/membres/${row.member.member_code}`}
                              className="text-brand-700 hover:underline"
                            >
                              {row.member.full_name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{row.card_number}</td>
                        <td className="px-4 py-3">{row.issued_at ?? "—"}</td>
                        <td className="px-4 py-3">{row.expires_at ?? "—"}</td>
                        <td className="px-4 py-3">
                          <CardStatusBadge status={row.status} label={row.status_label} />
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
    </>
  );
}
