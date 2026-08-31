"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { UsersPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import type { UsersReportResponse } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";

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
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Utilisateurs" },
        ]}
      />

      <DashboardAnimate>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Rapport utilisateurs système
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Comptes internes, rôles et dernières connexions.
            </p>
          </div>
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
        </div>
      </DashboardAnimate>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : (
        <>
          <div className={dashboardCardGrid}>
            <KpiCard label="Total" value={formatNumber(data.summary.total)} icon={Users} />
            <KpiCard label="Actifs" value={formatNumber(data.summary.active)} icon={Users} />
            <KpiCard
              label="Suspendus"
              value={formatNumber(data.summary.suspended)}
              icon={Users}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h2 className="mb-3 font-semibold text-slate-900">Par rôle</h2>
                <ul className="space-y-2 text-sm">
                  {data.by_role.map((row) => (
                    <li key={row.slug} className="flex justify-between">
                      <span>{row.role}</span>
                      <span className="font-medium">{formatNumber(row.total)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-0">
                <h2 className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">
                  Dernières connexions
                </h2>
                {data.recent.length === 0 ? (
                  <EmptyState
                    title="Aucune connexion"
                    description="Aucun utilisateur enregistré."
                  />
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {data.recent.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              {item.role} · {item.email}
                            </p>
                          </div>
                          <div className="text-right">
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
    </>
  );
}
