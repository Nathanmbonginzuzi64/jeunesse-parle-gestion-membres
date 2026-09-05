"use client";

import { useState } from "react";
import { Ban, CheckCircle2, Shield, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { UsersPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import type { UsersReportResponse } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCompactCount, formatDateTime, formatNumber } from "@/lib/utils";

const PER_PAGE = 10;

export default function UsersReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <UsersReport />
    </RequirePermission>
  );
}

function UsersReport() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error } = useApi<UsersReportResponse>("/reports/users", {
    page,
    per_page: PER_PAGE,
  });

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Utilisateurs" },
        ]}
      />

      <ReportPageHeader
        icon={Users}
        title="Rapport utilisateurs système"
        description="Comptes internes, rôles et dernières connexions."
        actions={
          <ReportPdfExportButton
            reportId="utilisateurs"
            disabled={!data}
            onPrepare={async () => {
              if (!data) throw new Error("Données indisponibles.");
              const first = await api.get<UsersReportResponse>("/reports/users", {
                page: 1,
                per_page: 100,
              });
              const allRecent = [...first.recent];
              for (let p = 2; p <= first.recent_meta.last_page; p++) {
                const next = await api.get<UsersReportResponse>("/reports/users", {
                  page: p,
                  per_page: 100,
                });
                allRecent.push(...next.recent);
              }
              return (
                <UsersPdfDocument
                  data={{ ...first, recent: allRecent }}
                  generatedBy={user?.name}
                />
              );
            }}
          />
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className={dashboardCardGrid}>
            <KpiCard
              label="Total"
              value={formatCompactCount(data.summary.total)}
              icon={Users}
              tone="info"
            />
            <KpiCard
              label="Actifs"
              value={formatCompactCount(data.summary.active)}
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              label="Suspendus"
              value={formatCompactCount(data.summary.suspended)}
              icon={Ban}
              tone="danger"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Par rôle" description={`${data.by_role.length} rôle(s)`} />
              <CardBody className="p-0">
                <ul className="divide-y divide-slate-100">
                  {data.by_role.map((row) => (
                    <li
                      key={row.slug}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                    >
                      <span className="inline-flex items-center gap-2 font-medium text-slate-900">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                          <Shield className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        {row.role}
                      </span>
                      <span className="rounded-md bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {formatNumber(row.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader
                title="Dernières connexions"
                description={`${formatNumber(data.recent_meta.total)} utilisateur(s)`}
              />
              <CardBody className="p-0">
                {data.recent.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Aucune connexion"
                    description="Aucun utilisateur enregistré."
                  />
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {data.recent.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="truncate text-xs text-slate-500">
                              {item.role} · {item.email}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge tone={item.is_active ? "success" : "danger"}>
                              {item.is_active ? "Actif" : "Suspendu"}
                            </Badge>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.last_login_at ? formatDateTime(item.last_login_at) : "Jamais"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Pagination
                      page={data.recent_meta.current_page}
                      lastPage={data.recent_meta.last_page}
                      total={data.recent_meta.total}
                      perPage={data.recent_meta.per_page}
                      onChange={setPage}
                      label="utilisateurs"
                    />
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
