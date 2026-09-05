"use client";

import { Check, Shield, Users, X } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { RolesPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { RolesReportResponse } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

const PERM_TONES = [
  "bg-sky-50 text-sky-800 ring-sky-100",
  "bg-emerald-50 text-emerald-800 ring-emerald-100",
  "bg-amber-50 text-amber-800 ring-amber-100",
  "bg-rose-50 text-rose-800 ring-rose-100",
  "bg-brand-50 text-brand-800 ring-brand-100",
] as const;

export default function RolesReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <RolesReport />
    </RequirePermission>
  );
}

function RolesReport() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<RolesReportResponse>("/reports/roles");

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Rôles & permissions" },
        ]}
      />

      <ReportPageHeader
        icon={Shield}
        title="Rôles & permissions (RBAC)"
        description="Permissions accordées, modules accessibles et actions autorisées par rôle."
        actions={
          <ReportPdfExportButton
            reportId="roles"
            disabled={!data?.data.length}
            onPrepare={async () => {
              if (!data) throw new Error("Données indisponibles.");
              return <RolesPdfDocument data={data} generatedBy={user?.name} />;
            }}
          />
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="h-64 w-full" />
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="Aucun rôle"
          description="Aucun rôle configuré dans le système."
        />
      ) : (
        <div className="space-y-4">
          {data.data.map((role, roleIndex) => (
            <Card
              key={role.id}
              className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm"
            >
              <CardBody className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Shield className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-900">{role.name}</h2>
                      {role.description ? (
                        <p className="mt-1 text-sm text-slate-600">{role.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      <Users className="h-3.5 w-3.5" />
                      {formatNumber(role.users_count)} utilisateur(s)
                    </span>
                    <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100">
                      Niveau {role.scope_level}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {role.permissions.map((perm, i) => (
                    <span
                      key={perm.slug}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 ${PERM_TONES[(roleIndex + i) % PERM_TONES.length]}`}
                      title={perm.module ?? undefined}
                    >
                      <Check className="h-3 w-3 shrink-0" aria-hidden />
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
    </div>
  );
}
