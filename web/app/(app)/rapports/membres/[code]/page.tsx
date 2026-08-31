"use client";

import { useParams } from "next/navigation";
import { Activity, CheckCircle2, User } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { MemberProfilePdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { MemberProfileReport } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default function MemberProfileReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <MemberProfileReport />
    </RequirePermission>
  );
}

function MemberProfileReport() {
  const { user } = useAuth();
  const params = useParams<{ code: string }>();
  const code = params.code;

  const { data, loading, error } = useApi<MemberProfileReport>(`/reports/members/${code}`);

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { href: "/rapports/membres", label: "Membres" },
          { label: code },
        ]}
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="mt-4 h-64 w-full" />
      ) : (
        <>
          <DashboardAnimate>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <User className="h-8 w-8" aria-hidden />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                    {data.member.full_name}
                  </h1>
                  <p className="text-sm text-slate-600">{data.member.member_code}</p>
                  <div className="mt-2">
                    <MemberStatusBadge
                      status={data.member.status}
                      label={data.member.status_label}
                    />
                  </div>
                </div>
              </div>
              <ReportPdfExportButton
                reportId={`membre-${code}`}
                onPrepare={async () => (
                  <MemberProfilePdfDocument data={data} generatedBy={user?.name} />
                )}
              />
            </div>
          </DashboardAnimate>

          <div className={dashboardCardGrid}>
            <KpiCard
              label="Activités"
              value={formatNumber(data.summary.activities_count)}
              icon={Activity}
            />
            <KpiCard
              label="Présences"
              value={`${data.summary.attendances_present}/${data.summary.attendances_total}`}
              icon={CheckCircle2}
            />
            <KpiCard
              label="Taux participation"
              value={
                data.summary.participation_rate !== null
                  ? `${data.summary.participation_rate}%`
                  : "—"
              }
              icon={CheckCircle2}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Informations personnelles" />
              <CardBody className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="text-slate-500">Profession :</span>{" "}
                  {data.profile.profession ?? "—"}
                </p>
                <p>
                  <span className="text-slate-500">Formation :</span>{" "}
                  {data.profile.education_level ?? "—"}
                </p>
                <p>
                  <span className="text-slate-500">Localisation :</span>{" "}
                  {[data.member.province, data.member.city, data.member.commune, data.member.quartier]
                    .filter(Boolean)
                    .join(" › ") || "—"}
                </p>
                <p>
                  <span className="text-slate-500">Structure :</span>{" "}
                  {data.member.structure ?? "—"}
                </p>
                {data.profile.skills.length ? (
                  <p>
                    <span className="text-slate-500">Compétences :</span>{" "}
                    {data.profile.skills.join(", ")}
                  </p>
                ) : null}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Jeunesse Parle" />
              <CardBody className="space-y-2 text-sm text-slate-700">
                <p>
                  <span className="text-slate-500">Carte :</span>{" "}
                  {data.member.card_status_label ?? "—"}
                  {data.member.card_number ? ` (${data.member.card_number})` : ""}
                </p>
                <p>
                  <span className="text-slate-500">Biométrie :</span>{" "}
                  {data.member.biometric_enrolled ? "Activée" : "Non enregistrée"}
                </p>
                <p>
                  <span className="text-slate-500">Inscription :</span>{" "}
                  {data.member.joined_at ?? "—"}
                </p>
                {data.member.supervisor ? (
                  <p>
                    <span className="text-slate-500">Responsable :</span>{" "}
                    {data.member.supervisor.full_name}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </div>

          <Card className="mt-4">
            <CardHeader title="Historique des activités" />
            <CardBody className="divide-y divide-slate-100 p-0">
              {data.activities.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Aucune activité enregistrée.</p>
              ) : (
                data.activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{activity.title}</p>
                      <p className="text-xs text-slate-500">
                        {activity.type_label}
                        {activity.starts_at ? ` · ${formatDateTime(activity.starts_at)}` : ""}
                      </p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="mt-4">
            <CardHeader title="Présences récentes" />
            <CardBody className="divide-y divide-slate-100 p-0">
              {data.attendances.length === 0 ? (
                <p className="p-4 text-sm text-slate-500">Aucune présence enregistrée.</p>
              ) : (
                data.attendances.slice(0, 20).map((row) => (
                  <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{row.activity}</p>
                      <p className="text-xs text-slate-500">
                        {row.date ?? "—"} · {row.method ?? "—"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-600">{row.status_label}</span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
