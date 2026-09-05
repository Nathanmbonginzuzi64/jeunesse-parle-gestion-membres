"use client";

import { useParams } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  CreditCard,
  Fingerprint,
  MapPin,
  Percent,
  User,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { MemberProfilePdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { MemberProfileReport } from "@/lib/reports/api-types";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCompactCount, formatDateTime, formatNumber } from "@/lib/utils";

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
    <div className="space-y-6 pb-10">
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
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <ReportPageHeader
            icon={User}
            title={data.member.full_name}
            description={`${data.member.member_code} · Fiche analytique individuelle`}
            actions={
              <ReportPdfExportButton
                reportId={`membre-${code}`}
                onPrepare={async () => (
                  <MemberProfilePdfDocument data={data} generatedBy={user?.name} />
                )}
              />
            }
          />

          <div
            className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-sky-50 p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md ring-4 ring-white">
                <User className="h-8 w-8" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">{data.member.full_name}</p>
                <p className="font-mono text-sm text-slate-600">{data.member.member_code}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {[data.member.province, data.member.city, data.member.commune, data.member.quartier]
                    .filter(Boolean)
                    .join(" › ") || "Localisation non renseignée"}
                </p>
              </div>
              <MemberStatusBadge
                status={data.member.status}
                label={data.member.status_label}
              />
            </div>
          </div>

          <div className={dashboardCardGrid}>
            <KpiCard
              label="Activités"
              value={formatCompactCount(data.summary.activities_count)}
              icon={Activity}
              tone="info"
            />
            <KpiCard
              label="Présences"
              value={`${formatNumber(data.summary.attendances_present)}/${formatNumber(data.summary.attendances_total)}`}
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              label="Taux participation"
              value={
                data.summary.participation_rate !== null
                  ? `${data.summary.participation_rate}%`
                  : "—"
              }
              icon={Percent}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Informations personnelles" />
              <CardBody className="space-y-3 text-sm text-slate-700">
                <InfoRow label="Profession" value={data.profile.profession ?? "—"} />
                <InfoRow label="Formation" value={data.profile.education_level ?? "—"} />
                <InfoRow
                  label="Localisation"
                  value={
                    [data.member.province, data.member.city, data.member.commune, data.member.quartier]
                      .filter(Boolean)
                      .join(" › ") || "—"
                  }
                />
                <InfoRow label="Structure" value={data.member.structure ?? "—"} />
                {data.profile.skills.length ? (
                  <div>
                    <p className="mb-1.5 text-xs font-medium tracking-wide text-slate-500 uppercase">
                      Compétences
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.profile.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800 ring-1 ring-sky-100"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Jeunesse Parle" />
              <CardBody className="space-y-3 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <InfoRow
                    label="Carte"
                    value={`${data.member.card_status_label ?? "—"}${data.member.card_number ? ` (${data.member.card_number})` : ""}`}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Fingerprint className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <InfoRow
                    label="Biométrie"
                    value={data.member.biometric_enrolled ? "Activée" : "Non enregistrée"}
                  />
                </div>
                <InfoRow label="Inscription" value={data.member.joined_at ?? "—"} />
                {data.member.supervisor ? (
                  <InfoRow label="Responsable" value={data.member.supervisor.full_name} />
                ) : null}
              </CardBody>
            </Card>
          </div>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader
              title="Historique des activités"
              description={`${formatNumber(data.activities.length)} activité(s)`}
            />
            <CardBody className="divide-y divide-slate-100 p-0">
              {data.activities.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Aucune activité"
                  description="Aucune activité enregistrée pour ce membre."
                />
              ) : (
                data.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{activity.title}</p>
                      <p className="text-xs text-slate-500">
                        {activity.type_label}
                        {activity.starts_at ? ` · ${formatDateTime(activity.starts_at)}` : ""}
                      </p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
            <CardHeader
              title="Présences récentes"
              description="20 dernières enregistrements"
            />
            <CardBody className="divide-y divide-slate-100 p-0">
              {data.attendances.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Aucune présence"
                  description="Aucune présence enregistrée pour ce membre."
                />
              ) : (
                data.attendances.slice(0, 20).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{row.activity}</p>
                      <p className="text-xs text-slate-500">
                        {row.date ?? "—"} · {row.method ?? "—"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                      {row.status_label}
                    </span>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-0.5 text-slate-800">{value}</p>
    </div>
  );
}
