"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  Info,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { Can } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
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
import { PERMISSIONS } from "@/lib/permissions";
import type { AppNotification, Paginated } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

const LEVEL_META: Record<
  string,
  { label: string; icon: typeof Info; tone: string; chip: string }
> = {
  success: {
    label: "Succès",
    icon: CheckCheck,
    tone: "border-emerald-200 bg-emerald-50",
    chip: "bg-emerald-100 text-emerald-800",
  },
  info: {
    label: "Information",
    icon: Info,
    tone: "border-brand-200 bg-brand-50",
    chip: "bg-brand-100 text-brand-800",
  },
  warning: {
    label: "Avertissement",
    icon: AlertTriangle,
    tone: "border-amber-200 bg-amber-50",
    chip: "bg-amber-100 text-amber-800",
  },
  danger: {
    label: "Urgent",
    icon: ShieldAlert,
    tone: "border-red-200 bg-red-50",
    chip: "bg-red-100 text-red-800",
  },
};

export default function NotificationsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useApi<Paginated<AppNotification>>("/notifications", {
    page,
    per_page: 20,
  });

  const unreadCount = useApi<{ count: number }>("/notifications/unread-count");

  const filtered = useMemo(() => {
    const list = data?.data ?? [];
    if (filter === "unread") return list.filter((n) => !n.is_read);
    if (filter === "read") return list.filter((n) => n.is_read);
    return list;
  }, [data?.data, filter]);

  const kpis = useMemo(() => {
    const list = data?.data ?? [];
    return {
      total: data?.meta.total ?? list.length,
      unread: unreadCount.data?.count ?? list.filter((n) => !n.is_read).length,
      urgent: list.filter((n) => n.level === "danger" || n.level === "warning").length,
      read: list.filter((n) => n.is_read).length,
    };
  }, [data, unreadCount.data]);

  async function markAll() {
    try {
      await api.post("/notifications/read-all");
      toast.success("Toutes les notifications sont marquées comme lues.");
      reload();
      unreadCount.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    }
  }

  async function markOne(id: number) {
    try {
      await api.post(`/notifications/${id}/read`);
      reload();
      unreadCount.reload();
    } catch {
      /* silencieux */
    }
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
      unreadCount.reload();
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

      <DashboardAnimate delay={100}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            tabs={[
              { id: "", label: "Toutes" },
              { id: "unread", label: "Non lues" },
              { id: "read", label: "Lues" },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void markAll()} disabled={kpis.unread === 0}>
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
            <Can permission={PERMISSIONS.notificationsSend}>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Créer
              </Button>
            </Can>
          </div>
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={140}>
        {error && <Alert tone="error">{error}</Alert>}
        {loading && <PageLoader />}
        {!loading && filtered.length === 0 && (
          <EmptyState
            title="Aucune notification"
            description={
              filter === "unread"
                ? "Vous êtes à jour — aucune alerte non lue."
                : "Les validations, cartes et activités apparaîtront ici."
            }
          />
        )}
        {!loading && filtered.length > 0 && (
          <Card>
            <CardHeader
              title="Fil d'alertes"
              description={`${filtered.length} notification(s) affichée(s)`}
            />
            <CardBody className="p-0">
              <ul className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <NotificationRow key={item.id} item={item} onMark={() => void markOne(item.id)} />
                ))}
              </ul>
              {data && (
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  total={data.meta.total}
                  perPage={data.meta.per_page}
                  onChange={setPage}
                  label="notifications"
                />
              )}
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
    </div>
  );
}

function NotificationRow({
  item,
  onMark,
}: {
  item: AppNotification;
  onMark: () => void;
}) {
  const meta = LEVEL_META[item.level] ?? LEVEL_META.info;
  const Icon = meta.icon;

  return (
    <li>
      <button
        type="button"
        onClick={() => !item.is_read && onMark()}
        className={cn(
          "flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-slate-50/80",
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
            {!item.is_read && (
              <span className="h-2 w-2 rounded-full bg-brand-500" title="Non lu" aria-label="Non lu" />
            )}
          </div>
          {item.body && <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>}
          <p className="mt-1.5 text-[11px] text-slate-400">{formatRelative(item.created_at)}</p>
        </div>
      </button>
    </li>
  );
}
