"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileEdit,
  LayoutGrid,
  MapPin,
  Pencil,
  Plus,
  Table2,
  Trash2,
  Users,
} from "lucide-react";
import { ActivitiesHero } from "@/components/activities/activities-hero";
import { ActivityForm } from "@/components/activities/activity-form";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { ActivityStatusBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced, useReferences } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { Activity, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

type ViewMode = "table" | "cards";

export default function ActivitiesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.activitiesView}>
      <ActivitiesList />
    </RequirePermission>
  );
}

function ActivitiesList() {
  const toast = useToast();
  const references = useReferences();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tab, setTab] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(q);

  const { data, loading, error, reload } = useApi<Paginated<Activity>>("/activities", {
    page,
    q: debounced,
    type: type || undefined,
    tab: tab || undefined,
    per_page: 20,
  });

  const allActivities = useApi<Paginated<Activity>>("/activities", { per_page: 100 });

  const kpis = useMemo(() => {
    const list = allActivities.data?.data ?? [];
    return {
      total: allActivities.data?.meta.total ?? list.length,
      upcoming: list.filter((a) => a.status === "planned").length,
      ongoing: list.filter((a) => a.status === "ongoing").length,
      completed: list.filter((a) => a.status === "completed").length,
      drafts: list.filter((a) => a.status === "draft").length,
    };
  }, [allActivities.data]);

  async function removeActivity() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const response = await api.delete<{ message: string }>(`/activities/${deleteTarget.id}`);
      toast.success(response.message);
      setDeleteTarget(null);
      reload();
      allActivities.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Mobilisation" }, { label: "Activités" }]} />

      <DashboardAnimate>
        <ActivitiesHero
          total={kpis.total}
          upcoming={kpis.upcoming}
          ongoing={kpis.ongoing}
          drafts={kpis.drafts}
        />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Total" value={kpis.total} icon={CalendarDays} tone="info" />
          <KpiCard label="À venir" value={kpis.upcoming} icon={Clock3} tone="warning" />
          <KpiCard label="En cours" value={kpis.ongoing} icon={CheckCircle2} tone="success" />
          <KpiCard label="Brouillons" value={kpis.drafts} icon={FileEdit} tone="neutral" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { id: "", label: "Toutes" },
              { id: "upcoming", label: "À venir" },
              { id: "completed", label: "Terminées" },
              { id: "drafts", label: "Brouillons" },
            ]}
            value={tab}
            onChange={(id) => {
              setTab(id);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setView("table")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  view === "table" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <Table2 className="h-3.5 w-3.5" />
                Liste
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition",
                  view === "cards" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cartes
              </button>
            </div>
            <Can permission={PERMISSIONS.activitiesManage}>
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Nouvelle activité
              </Button>
            </Can>
          </div>
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={140}>
        <Card>
          <CardHeader
            title="Programme"
            description={
              data
                ? `${formatNumber(data.meta.total)} activité(s) · filtre ${tab || "toutes"}`
                : "Recherche et filtres"
            }
          />
          <div className="flex flex-wrap gap-3 border-b border-slate-100 px-4 pb-4">
            <Input
              placeholder="Rechercher une activité…"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              wrapperClassName="min-w-[12rem] flex-1"
            />
            <Select
              placeholder="Type"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              options={references?.activity_types ?? []}
              wrapperClassName="w-44"
            />
          </div>
          <CardBody className="p-0">
            {error && (
              <div className="p-4">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            {loading && <TableSkeleton />}
            {!loading && data?.data.length === 0 && (
              <EmptyState
                title="Aucune activité"
                description="Créez une formation, une réunion ou une mission pour démarrer."
              />
            )}
            {!loading && data && data.data.length > 0 && view === "table" && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>Activité</Th>
                      <Th>Type</Th>
                      <Th>Date</Th>
                      <Th>Lieu</Th>
                      <Th>Présences</Th>
                      <Th>Statut</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((activity) => (
                      <Tr key={activity.id}>
                        <Td>
                          <Link href={`/activites/${activity.id}`} className="font-medium hover:text-brand-700">
                            {activity.title}
                          </Link>
                          <p className="font-mono text-[11px] text-slate-400">{activity.code}</p>
                        </Td>
                        <Td className="text-xs">{activity.type_label}</Td>
                        <Td className="text-xs">{formatDateTime(activity.starts_at)}</Td>
                        <Td className="max-w-[10rem] truncate text-xs text-slate-500">
                          {activity.location ?? "—"}
                        </Td>
                        <Td className="text-xs tabular-nums">
                          {activity.attendances_count ?? 0}/{activity.participants_count ?? 0}
                        </Td>
                        <Td>
                          <ActivityStatusBadge status={activity.status} label={activity.status_label} />
                        </Td>
                        <Td>
                          <Can permission={PERMISSIONS.activitiesManage}>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(activity);
                                  setOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(activity)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Can>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  total={data.meta.total}
                  perPage={data.meta.per_page}
                  onChange={setPage}
                  label="activités"
                />
              </>
            )}
            {!loading && data && data.data.length > 0 && view === "cards" && (
              <div className="space-y-4 p-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {data.data.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onEdit={() => {
                        setEditing(activity);
                        setOpen(true);
                      }}
                      onDelete={() => setDeleteTarget(activity)}
                    />
                  ))}
                </div>
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  total={data.meta.total}
                  perPage={data.meta.per_page}
                  onChange={setPage}
                  label="activités"
                />
              </div>
            )}
          </CardBody>
        </Card>
      </DashboardAnimate>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier l'activité" : "Nouvelle activité"}
        size="lg"
      >
        <ActivityForm
          key={editing?.id ?? "new"}
          initial={editing}
          submitLabel={editing ? "Enregistrer" : "Créer l'activité"}
          onSaved={(_, message) => {
            toast.success(message);
            setOpen(false);
            reload();
            allActivities.reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeActivity()}
        loading={busy}
        title="Supprimer cette activité ?"
        message="Cette action est définitive. La feuille de présence associée sera perdue."
        confirmLabel="Supprimer"
        tone="danger"
      />
    </div>
  );
}

function ActivityCard({
  activity,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-brand-300 hover:shadow-[var(--shadow-elevated)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-gold-400 to-emerald-500 opacity-80" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{activity.type_label}</p>
          <Link href={`/activites/${activity.id}`} className="mt-0.5 block truncate font-semibold text-slate-900 hover:text-brand-700">
            {activity.title}
          </Link>
          <p className="font-mono text-[11px] text-brand-700">{activity.code}</p>
        </div>
        <ActivityStatusBadge status={activity.status} label={activity.status_label} />
      </div>
      <div className="mt-3 space-y-1.5 text-xs text-slate-500">
        <p className="flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5 text-brand-500" />
          {formatDateTime(activity.starts_at)}
        </p>
        {activity.location && (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-brand-500" />
            {activity.location}
          </p>
        )}
        <p className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-brand-500" />
          {activity.attendances_count ?? 0}/{activity.participants_count ?? 0} présents
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <Link href={`/activites/${activity.id}`}>
          <Button variant="outline" size="sm">
            Détail
          </Button>
        </Link>
        <Can permission={PERMISSIONS.activitiesManage}>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </Can>
      </div>
    </article>
  );
}
