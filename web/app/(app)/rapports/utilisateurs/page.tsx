"use client";

import { Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import type { UsersReportResponse } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default function UsersReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <UsersReport />
    </RequirePermission>
  );
}

function UsersReport() {
  const { data, loading, error } = useApi<UsersReportResponse>("/reports/users");

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
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Rapport utilisateurs système
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Comptes internes, rôles et dernières connexions.
        </p>
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
                <div className="divide-y divide-slate-100">
                  {data.recent.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">
                          {user.role} · {user.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={user.is_active ? "success" : "danger"}>
                          {user.is_active ? "Actif" : "Suspendu"}
                        </Badge>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.last_login_at ? formatDateTime(user.last_login_at) : "Jamais"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
