"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { Can } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { NotificationDetailModal } from "@/components/notifications/notification-detail-modal";
import { notificationLevelMeta } from "@/components/notifications/notification-level";
import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";
import { NotificationsHero } from "@/components/notifications/notifications-hero";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import { useNotificationFeed } from "@/lib/hooks/use-notification-feed";
import { NOTIFICATION_CATEGORIES, categoryLabel } from "@/lib/notifications/catalog";
import { PERMISSIONS } from "@/lib/permissions";
import type { AppNotification, Paginated } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

export default function NotificationsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState("");
  const [category, setCategory] = useState("");
  const [showPrefs, setShowPrefs] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const query = useMemo(
    () => ({
      page,
      per_page: 20,
      unread_only: readFilter === "unread" ? 1 : undefined,
      category: category || undefined,
    }),
    [page, readFilter, category],
  );

  const { data, loading, error, reload } = useApi<Paginated<AppNotification>>("/notifications", query);
  const { unreadCount, refreshCount } = useNotificationFeed();

  const list = data?.data ?? [];

  const kpis = useMemo(
    () => ({
      total: data?.meta.total ?? list.length,
      unread: unreadCount,
      urgent: list.filter((n) => n.level === "danger" || n.level === "warning").length,
      read: list.filter((n) => n.is_read).length,
    }),
    [data, list, unreadCount],
  );

  async function markAll() {
    try {
      await api.post("/notifications/read-all");
      toast.success("Toutes les notifications sont marquées comme lues.");
      reload();
      refreshCount();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    }
  }

  async function markOne(id: number) {
    try {
      await api.post(`/notifications/${id}/read`);
      reload();
      refreshCount();
    } catch {
      /* silencieux */
    }
  }

  async function removeOne(id: number) {
    try {
      await api.delete(`/notifications/${id}`);
      toast.success("Notification supprimée.");
      reload();
      refreshCount();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    }
  }

  function openNotification(item: AppNotification) {
    setSelected({ ...item, is_read: true });
    if (!item.is_read) void markOne(item.id);
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const response = await api.post<{ message: string }>("/notifications", { title, body, level });
      toast.success(response.message);
      setCreateOpen(false);
      setTitle("");
      setBody("");
      setLevel("info");
      reload();
      refreshCount();
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(fieldErrors(caught));
      else toast.error("Envoi impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Notifications" }]} />

      <DashboardAnimate>
        <NotificationsHero total={kpis.total} unread={kpis.unread} />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Total" value={kpis.total} icon={Bell} tone="info" />
          <KpiCard label="Non lues" value={kpis.unread} icon={BellRing} tone="warning" />
          <KpiCard label="Lues (page)" value={kpis.read} icon={CheckCheck} tone="success" />
          <KpiCard label="Alertes" value={kpis.urgent} icon={AlertTriangle} tone="danger" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={80}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { id: "", label: "Toutes" },
              { id: "unread", label: "Non lues" },
              { id: "read", label: "Lues" },
            ]}
            value={readFilter}
            onChange={(value) => {
              setReadFilter(value);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="min-w-[10rem]"
            >
              {NOTIFICATION_CATEGORIES.map((item) => (
                <option key={item.id || "all"} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Button variant="outline" size="sm" onClick={() => setShowPrefs((v) => !v)}>
              <Settings2 className="h-4 w-4" />
              Préférences
            </Button>
            <Button variant="outline" size="sm" onClick={() => void markAll()} disabled={kpis.unread === 0}>
              <CheckCheck className="h-4 w-4" />
              Tout lire
            </Button>
            <Can permission={PERMISSIONS.statisticsView}>
              <Link href="/statistiques/notifications">
                <Button variant="ghost" size="sm">
                  Statistiques admin
                </Button>
              </Link>
            </Can>
            <Can permission={PERMISSIONS.notificationsSend}>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Créer
              </Button>
            </Can>
          </div>
        </div>
      </DashboardAnimate>

      {showPrefs ? (
        <DashboardAnimate delay={100}>
          <NotificationPreferencesPanel />
        </DashboardAnimate>
      ) : null}

      <DashboardAnimate delay={120}>
        {error && <Alert tone="error">{error}</Alert>}
        {loading && !data ? <PageLoader /> : null}
        {!loading && list.length === 0 && (
          <EmptyState
            title="Aucune notification"
            description={
              readFilter === "unread"
                ? "Vous êtes à jour — aucune alerte non lue."
                : "Les validations, cartes, activités et messages apparaîtront ici."
            }
          />
        )}
        {!loading && list.length > 0 && (
          <Card>
            <CardHeader title="Fil d'alertes" description={`${list.length} notification(s) sur cette page`} />
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-100">
                {list.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onOpen={() => openNotification(item)}
                    onDelete={() => void removeOne(item.id)}
                  />
                ))}
              </ul>
              {data ? (
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  total={data.meta.total}
                  perPage={data.meta.per_page}
                  onChange={setPage}
                  label="notifications"
                />
              ) : null}
            </CardBody>
          </Card>
        )}
      </DashboardAnimate>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nouvelle notification" size="md">
        <form onSubmit={onCreate} className="space-y-4">
          <Input label="Titre" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
          <Textarea label="Message" value={body} onChange={(e) => setBody(e.target.value)} error={errors.body} />
          <Select
            label="Niveau"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            options={[
              { value: "info", label: "Information" },
              { value: "success", label: "Succès" },
              { value: "warning", label: "Avertissement" },
              { value: "danger", label: "Urgent" },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={submitting}>
              Envoyer
            </Button>
          </div>
        </form>
      </Modal>

      <NotificationDetailModal notification={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function NotificationRow({
  item,
  onOpen,
  onDelete,
}: {
  item: AppNotification;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const meta = notificationLevelMeta(item.level);
  const Icon = meta.icon;

  return (
    <li className="group flex items-stretch">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex min-w-0 flex-1 items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50/80",
          !item.is_read && "bg-brand-50/40",
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            meta.tone,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={cn("text-sm text-slate-900", !item.is_read && "font-semibold")}>{item.title}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase", meta.chip)}>
              {meta.label}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {categoryLabel(item.category)}
            </span>
            {!item.is_read && (
              <span className="h-2 w-2 rounded-full bg-brand-500" title="Non lu" aria-label="Non lu" />
            )}
          </div>
          {item.body ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.body}</p> : null}
          <p className="mt-1.5 text-[11px] text-slate-400">{formatRelative(item.created_at)}</p>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex items-center px-4 text-slate-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
        aria-label="Supprimer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
