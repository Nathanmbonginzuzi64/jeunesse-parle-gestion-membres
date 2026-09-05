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
  User,
  Users,
} from "lucide-react";
import { ActivityDetailHero } from "@/components/activities/activity-detail-hero";
import { ActivityForm } from "@/components/activities/activity-form";
import { ActivityLiveLocationPanel } from "@/components/activities/activity-live-location-panel";
import { Can } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { ActivityStatusBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Activity, AttendanceSheet } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

export default function ActivityShowPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { can } = useAuth();
  const activity = useApi<{ data: Activity }>(`/activities/${params.id}`);
  const sheet = useApi<AttendanceSheet>(`/activities/${params.id}/attendance/sheet`);
  const [editOpen, setEditOpen] = useState(false);

  if (activity.loading) return <PageLoader />;
  if (activity.error || !activity.data?.data) {
    return <Alert tone="error">{activity.error ?? "Activité introuvable."}</Alert>;
  }

  const item = activity.data.data;
  const summary = sheet.data?.summary;
  const registered = item.participants_count ?? summary?.expected ?? 0;
  const confirmed = summary?.present ?? item.attendances_count ?? 0;
  const absences = summary?.absent ?? 0;
  const rate = registered ? Math.round((confirmed / registered) * 100) : 0;

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className={cn(dashboardCardGrid, "flex-1 sm:grid-cols-2 lg:grid-cols-4")}>
            <KpiCard label="Participants inscrits" value={formatNumber(registered)} icon={Users} tone="info" />
            <KpiCard label="Présences confirmées" value={formatNumber(confirmed)} icon={ClipboardList} tone="success" />
            <KpiCard label="Absences" value={formatNumber(absences)} icon={Users} tone="danger" />
            <KpiCard label="Taux participation" value={`${rate} %`} icon={ClipboardList} tone="warning" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Can permission={PERMISSIONS.attendanceView}>
              <Link href={`/presences/${item.id}`}>
                <Button size="sm">
                  <ClipboardList className="h-4 w-4" />
                  Gérer les présences
                </Button>
              </Link>
            </Can>
            <Can permission={PERMISSIONS.activitiesManage}>
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            </Can>
          </div>
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader title="Informations" description="Résumé de l'activité" />
            <CardBody className="space-y-3">
              {item.description ? (
                <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">{item.description}</p>
              ) : null}
              <dl className="grid gap-2.5">
                <DetailItem icon={CalendarDays} label="Début" value={formatDateTime(item.starts_at)} />
                <DetailItem icon={CalendarDays} label="Fin" value={formatDateTime(item.ends_at)} />
                <DetailItem icon={MapPin} label="Lieu" value={item.location ?? "—"} />
                <DetailItem icon={Building2} label="Structure" value={item.structure?.name ?? "—"} />
                <DetailItem
                  icon={MapPin}
                  label="Territoire"
                  value={[item.province?.name, item.city?.name, item.commune?.name, item.quartier?.name, item.avenue?.name]
                    .filter(Boolean)
                    .join(" › ") || "—"}
                />
                <DetailItem icon={User} label="Organisateur" value={item.organizer?.name ?? "—"} />
                <DetailItem icon={Globe} label="Visibilité" value={item.is_public ? "Visible des membres" : "Interne"} />
                <DetailItem icon={Users} label="Capacité" value={item.capacity ? String(item.capacity) : "—"} />
                <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Statut</dt>
                  <dd className="mt-1">
                    <ActivityStatusBadge status={item.status} label={item.status_label} />
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <ActivityLiveLocationPanel
            activity={item}
            canManage={can(PERMISSIONS.activitiesManage)}
            onUpdated={() => activity.reload()}
          />
        </div>
      </DashboardAnimate>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier l'activité" size="xl">
        <ActivityForm
          key={item.id}
          initial={item}
          submitLabel="Enregistrer"
          onSaved={(updated, message) => {
            toast.success(message);
            setEditOpen(false);
            activity.reload();
            sheet.reload();
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
    <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-2">
      <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </dt>
      <dd className="mt-0.5 text-xs font-medium leading-snug text-slate-900 break-words">{value}</dd>
    </div>
  );
}
