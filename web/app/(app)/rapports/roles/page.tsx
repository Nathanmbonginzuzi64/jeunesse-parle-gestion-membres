"use client";

import { Check, Shield, X } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import type { RolesReportResponse } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

export default function RolesReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <RolesReport />
    </RequirePermission>
  );
}

function RolesReport() {
  const { data, loading, error } = useApi<RolesReportResponse>("/reports/roles");

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Rôles & permissions" },
        ]}
      />

      <DashboardAnimate>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Rôles & permissions (RBAC)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Permissions accordées, modules accessibles et actions autorisées par rôle.
        </p>
      </DashboardAnimate>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : (
        <div className="mt-4 space-y-4">
          {data.data.map((role) => (
            <Card key={role.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                      <Shield className="h-4 w-4 text-brand-600" aria-hidden />
                      {role.name}
                    </h2>
                    {role.description ? (
                      <p className="mt-1 text-sm text-slate-600">{role.description}</p>
                    ) : null}
                  </div>
                  <span className="text-sm text-slate-500">
                    {formatNumber(role.users_count)} utilisateur(s) · niveau {role.scope_level}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {role.permissions.map((perm) => (
                    <span
                      key={perm.slug}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800 ring-1 ring-emerald-200"
                      title={perm.module ?? undefined}
                    >
                      <Check className="h-3 w-3" aria-hidden />
                      {perm.name}
                    </span>
                  ))}
                  {role.permissions.length === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <X className="h-3 w-3" /> Aucune permission
                    </span>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
