"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  TimerOff,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { CardsPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CardStatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { CardsReportResponse } from "@/lib/reports/api-types";
import { fetchAllReportPages } from "@/lib/reports/fetch-all-pages";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCompactCount, formatNumber } from "@/lib/utils";

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
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Cartes" },
        ]}
      />

      <ReportPageHeader
        icon={CreditCard}
        title="Rapport des cartes"
        description="Vue globale et détail par membre — actives, expirées, suspendues, perdues, remplacées."
        actions={
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
        }
      />

      {summary ? (
        <div className={dashboardCardGrid}>
          <KpiCard label="Total cartes" value={formatCompactCount(summary.total)} icon={CreditCard} tone="info" />
          <KpiCard label="Actives" value={formatCompactCount(summary.active)} icon={CheckCircle2} tone="success" />
          <KpiCard label="Expirées" value={formatCompactCount(summary.expired)} icon={TimerOff} tone="warning" />
          <KpiCard label="Suspendues" value={formatCompactCount(summary.suspended)} icon={Ban} tone="danger" />
          <KpiCard label="Perdues" value={formatCompactCount(summary.lost)} icon={ShieldAlert} tone="danger" />
          <KpiCard label="Remplacées" value={formatCompactCount(summary.replaced)} icon={RefreshCw} tone="neutral" />
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader
          title="Détail des cartes"
          description={
            data?.meta
              ? `${formatNumber(data.meta.total)} carte(s) au total`
              : "Liste paginée des cartes émises"
          }
        />
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
                  <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
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
                      <tr key={row.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          {row.member ? (
                            <Link
                              href={`/rapports/membres/${row.member.member_code}`}
                              className="font-medium text-brand-700 hover:underline"
                            >
                              {row.member.full_name}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.card_number}</td>
                        <td className="px-4 py-3 text-slate-600">{row.issued_at ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.expires_at ?? "—"}</td>
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
                total={data.meta.total}
                perPage={data.meta.per_page}
                onChange={setPage}
                label="cartes"
              />
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
