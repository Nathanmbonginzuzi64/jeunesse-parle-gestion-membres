"use client";

import Link from "next/link";
import { useState, type ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Globe,
  MapPin,
  Pencil,
  ScanLine,
  User,
  Users,
} from "lucide-react";
import { ActivityDetailHero } from "@/components/activities/activity-detail-hero";
import { ActivityForm } from "@/components/activities/activity-form";
import { Can } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { ActivityStatusBadge, AttendanceStatusBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Activity, AttendanceSheet } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

export default function ActivityShowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const activity = useApi<{ data: Activity }>(`/activities/${params.id}`);
  const sheet = useApi<AttendanceSheet>(`/activities/${params.id}/attendance/sheet`);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  async function record(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/activities/${params.id}/attendance`, payload);
      toast.success(response.message);
      sheet.reload();
      activity.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Pointage impossible.");
    } finally {
      setBusy(false);
    }
  }

  function handleScan(value: string) {
    const trimmed = value.trim();
    if (trimmed.toUpperCase().startsWith("JP-RDC-")) {
      void record({ member_code: trimmed });
    } else {
      void record({ qr_token: extractTokenFromQr(trimmed) });
    }
  }

  if (activity.loading) return <PageLoader />;
  if (activity.error || !activity.data?.data) {
    return <Alert tone="error">{activity.error ?? "Activité introuvable."}</Alert>;
  }

  const item = activity.data.data;
  const summary = sheet.data?.summary;
  const expected = item.participants_count ?? summary?.expected ?? 0;
  const present = item.attendances_count ?? summary?.present ?? 0;
  const rate = expected ? Math.round((present / expected) * 100) : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/activites", label: "Mobilisation" },
          { href: "/activites", label: "Activités" },
          { label: item.title },
        ]}
      />

      <DashboardAnimate>
        <ActivityDetailHero activity={item} />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={cn(dashboardCardGrid, "flex-1 sm:grid-cols-2 lg:grid-cols-4")}>
            <KpiCard label="Participants" value={expected} icon={Users} tone="info" />
            <KpiCard label="Présents" value={present} icon={ClipboardList} tone="success" />
            <KpiCard label="Taux" value={`${rate} %`} icon={ScanLine} tone="warning" />
            <KpiCard
              label="Capacité"
              value={item.capacity ?? "—"}
              icon={Building2}
              tone="neutral"
              hint={item.capacity ? "places max." : undefined}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/presences">
              <Button variant="outline" size="sm">
                <ClipboardList className="h-4 w-4" />
                Hub présences
              </Button>
            </Link>
            <Can permission={PERMISSIONS.activitiesManage}>
              <Button size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            </Can>
          </div>
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Informations" description="Détail de l'activité" />
            <CardBody className="space-y-4">
              {item.description ? (
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              ) : (
                <p className="text-sm italic text-slate-400">Aucune description renseignée.</p>
              )}
              <dl className="grid gap-4 sm:grid-cols-2">
                <DetailItem icon={CalendarDays} label="Début" value={formatDateTime(item.starts_at)} />
                <DetailItem icon={CalendarDays} label="Fin" value={formatDateTime(item.ends_at)} />
                <DetailItem icon={MapPin} label="Lieu" value={item.location ?? "—"} />
                <DetailItem icon={Building2} label="Structure" value={item.structure?.name ?? "—"} />
                <DetailItem icon={MapPin} label="Province" value={item.province?.name ?? "—"} />
                <DetailItem icon={User} label="Responsable" value={item.organizer?.name ?? "—"} />
                <DetailItem icon={Globe} label="Visibilité" value={item.is_public ? "Visible des membres" : "Interne"} />
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Statut</dt>
                  <dd className="mt-1">
                    <ActivityStatusBadge status={item.status} label={item.status_label} />
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {item.image_url && (
            <Card>
              <CardHeader title="Image" description="Couverture de l'activité" />
              <CardBody className="p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt="" className="max-h-80 w-full object-cover" />
              </CardBody>
            </Card>
          )}
        </div>
      </DashboardAnimate>

      <Can permission={PERMISSIONS.attendanceRecord}>
        <DashboardAnimate delay={140}>
          <Card>
            <CardHeader title="Pointer une présence" description="Scan QR ou identifiant membre." />
            <CardBody>
              <QrScannerPanel onScan={handleScan} loading={busy} />
            </CardBody>
          </Card>
        </DashboardAnimate>
      </Can>

      <DashboardAnimate delay={180}>
        <Card>
          <CardHeader
            title="Feuille de présence"
            description={
              summary
                ? `${formatNumber(summary.present)} présents · ${formatNumber(summary.absent)} absents · ${formatNumber(summary.not_recorded)} non pointés`
                : "Liste des participants"
            }
          />
          <CardBody className="p-0">
            {!sheet.data?.rows.length && <EmptyState title="Aucun participant inscrit" />}
            <ul className="divide-y divide-slate-100">
              {sheet.data?.rows.map((row) => (
                <li key={row.member_id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={row.photo_url} name={row.full_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{row.full_name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{row.member_code}</p>
                      {row.structure && <p className="text-[11px] text-slate-500">{row.structure}</p>}
                    </div>
                  </div>
                  {row.status ? (
                    <AttendanceStatusBadge status={row.status} label={row.status_label} />
                  ) : (
                    <span className="text-xs text-slate-400">Non pointé</span>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </DashboardAnimate>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier l'activité" size="lg">
        <ActivityForm
          key={item.id}
          initial={item}
          submitLabel="Enregistrer"
          onSaved={(updated, message) => {
            toast.success(message);
            setEditOpen(false);
            activity.reload();
            if (updated.id !== item.id) router.replace(`/activites/${updated.id}`);
          }}
        />
      </Modal>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
