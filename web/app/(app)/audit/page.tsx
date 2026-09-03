"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  Download,
  Fingerprint,
  Globe2,
  KeyRound,
  LogIn,
  MessageSquare,
  MonitorSmartphone,
  Newspaper,
  Radio,
  Settings2,
  Shield,
  Smartphone,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { AuditHero } from "@/components/audit/audit-hero";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { AuditLog, AuditPortal, AuditStats, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

const POLL_MS = 8_000;

const CATEGORIES = [
  { id: "", label: "Tous" },
  { id: "auth", label: "Connexions" },
  { id: "member", label: "Membres" },
  { id: "card", label: "Cartes" },
  { id: "attendance", label: "Présences" },
  { id: "activity", label: "Activités" },
  { id: "user", label: "Utilisateurs" },
  { id: "news", label: "Actualités" },
  { id: "jp_message", label: "JP Message" },
  { id: "chat", label: "Conversations" },
  { id: "settings", label: "Paramètres" },
  { id: "export", label: "Exports" },
] as const;

const PORTAL_TABS = [
  { id: "all", label: "Tous portails" },
  { id: "web", label: "Web" },
  { id: "mobile", label: "Mobile" },
  { id: "api", label: "API" },
  { id: "system", label: "Système" },
] as const;

const ACTION_META: Record<string, { tone: string; icon: typeof Shield; label: string }> = {
  auth: { tone: "bg-slate-100 text-slate-700", icon: LogIn, label: "Authentification" },
  member: { tone: "bg-brand-100 text-brand-800", icon: UserCheck, label: "Membre" },
  card: { tone: "bg-emerald-100 text-emerald-800", icon: CreditCard, label: "Carte" },
  attendance: { tone: "bg-teal-100 text-teal-800", icon: Fingerprint, label: "Présence" },
  activity: { tone: "bg-cyan-100 text-cyan-800", icon: CalendarDays, label: "Activité" },
  export: { tone: "bg-amber-100 text-amber-800", icon: Download, label: "Export" },
  user: { tone: "bg-indigo-100 text-indigo-800", icon: KeyRound, label: "Utilisateur" },
  news: { tone: "bg-rose-100 text-rose-800", icon: Newspaper, label: "Actualité" },
  jp_message: { tone: "bg-violet-100 text-violet-800", icon: MessageSquare, label: "JP Message" },
  chat: { tone: "bg-fuchsia-100 text-fuchsia-800", icon: MessageSquare, label: "Conversation" },
  settings: { tone: "bg-orange-100 text-orange-800", icon: Settings2, label: "Paramètres" },
  role: { tone: "bg-sky-100 text-sky-800", icon: Shield, label: "Rôle" },
  BIOMETRIC_REVOKED: { tone: "bg-red-100 text-red-800", icon: Fingerprint, label: "Biométrie" },
};

function actionMeta(action: string) {
  if (action.startsWith("BIOMETRIC") || action.includes("biometric")) {
    return { tone: "bg-red-100 text-red-800", icon: Fingerprint, label: "Biométrie" };
  }
  const key = action.split(".")[0] ?? action;
  return ACTION_META[key] ?? { tone: "bg-slate-100 text-slate-700", icon: Shield, label: key };
}

function portalMeta(portal?: string | null) {
  switch (portal) {
    case "mobile":
      return { label: "Mobile", tone: "info" as const, icon: Smartphone };
    case "web":
      return { label: "Web", tone: "success" as const, icon: MonitorSmartphone };
    case "system":
      return { label: "Système", tone: "neutral" as const, icon: Radio };
    case "api":
      return { label: "API", tone: "warning" as const, icon: Globe2 };
    default:
      return { label: "Inconnu", tone: "neutral" as const, icon: Globe2 };
  }
}

function hasDiff(log: AuditLog) {
  return Boolean(
    (log.old_values && Object.keys(log.old_values).length > 0) ||
      (log.new_values && Object.keys(log.new_values).length > 0),
  );
}

function DiffBlock({ title, values, tone }: { title: string; values: Record<string, unknown> | null; tone: "old" | "new" }) {
  if (!values || Object.keys(values).length === 0) return null;
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        tone === "old" ? "border-red-100 bg-red-50/50" : "border-emerald-100 bg-emerald-50/50",
      )}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <dl className="space-y-1">
        {Object.entries(values).map(([key, value]) => (
          <div key={key} className="grid grid-cols-[7rem_1fr] gap-2 text-xs">
            <dt className="truncate font-mono text-slate-500">{key}</dt>
            <dd className="break-all text-slate-800">
              {value === null || value === undefined
                ? "—"
                : typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AuditPage() {
  return (
    <RequirePermission permission={PERMISSIONS.auditView}>
      <AuditList />
    </RequirePermission>
  );
}

function AuditList() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [portal, setPortal] = useState<"" | AuditPortal>("");
  const [q, setQ] = useState("");
  const [liveFlash, setLiveFlash] = useState(false);
  const debounced = useDebounced(q);

  const { data, loading, error, reload } = useApi<Paginated<AuditLog>>("/audit", {
    page,
    action: category || undefined,
    portal: portal || undefined,
    q: debounced || undefined,
    per_page: 25,
  });

  const stats = useApi<{ data: AuditStats }>("/audit/stats");

  useEffect(() => {
    if (page !== 1) return;

    const tick = window.setInterval(() => {
      reload();
      stats.reload();
    }, POLL_MS);

    return () => window.clearInterval(tick);
  }, [page, reload, stats.reload]);

  useEffect(() => {
    const latest = stats.data?.data.latest_id;
    if (!latest) return;
    const key = "jp-audit-latest";
    const previous = Number(sessionStorage.getItem(key) || "0");
    if (previous > 0 && latest > previous) {
      setLiveFlash(true);
      const timer = window.setTimeout(() => setLiveFlash(false), 2500);
      sessionStorage.setItem(key, String(latest));
      return () => window.clearTimeout(timer);
    }
    sessionStorage.setItem(key, String(latest));
  }, [stats.data?.data.latest_id]);

  const kpis = useMemo(() => {
    const s = stats.data?.data;
    return {
      total: s?.total ?? data?.meta.total ?? 0,
      today: s?.today ?? 0,
      last24h: s?.last_24h ?? 0,
      web: s?.by_portal.web ?? 0,
      mobile: s?.by_portal.mobile ?? 0,
    };
  }, [stats.data, data?.meta.total]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/parametres", label: "Administration" }, { label: "Journal d'audit" }]} />

      <DashboardAnimate>
        <AuditHero
          total={kpis.total}
          today={kpis.today}
          web={kpis.web}
          mobile={kpis.mobile}
          live={page === 1}
        />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Tous les événements" value={kpis.total} icon={Shield} tone="info" />
          <KpiCard label="Aujourd'hui" value={kpis.today} icon={Radio} tone="success" />
          <KpiCard label="Portail web" value={kpis.web} icon={MonitorSmartphone} tone="neutral" />
          <KpiCard label="Application mobile" value={kpis.mobile} icon={Smartphone} tone="warning" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <Card className={cn(liveFlash && "ring-2 ring-emerald-300/70 transition")}>
          <CardHeader
            title="Fil d'événements"
            description="Actions de tous les utilisateurs, quel que soit le portail (web ou mobile)."
            action={
              page === 1 ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Actualisation auto
                </span>
              ) : null
            }
          />
          <div className="space-y-3 border-b border-slate-100 px-4 pb-4">
            <Tabs
              tabs={PORTAL_TABS.map((item) => ({ id: item.id, label: item.label }))}
              value={portal || "all"}
              onChange={(id) => {
                setPortal(id === "all" ? "" : (id as AuditPortal));
                setPage(1);
              }}
            />
            <Tabs
              tabs={CATEGORIES.map((item) => ({ id: item.id || "all", label: item.label }))}
              value={category || "all"}
              onChange={(id) => {
                setCategory(id === "all" ? "" : id);
                setPage(1);
              }}
            />
            <Input
              placeholder="Rechercher action, utilisateur, IP, portail…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <CardBody className="p-0">
            {error && (
              <div className="p-4">
                <Alert tone="error">{error}</Alert>
              </div>
            )}
            {loading && !data && <TableSkeleton />}
            {!loading && data?.data.length === 0 && (
              <EmptyState title="Aucun événement" description="Aucun journal ne correspond à ces filtres." />
            )}
            {data && data.data.length > 0 && (
              <>
                <ol className="divide-y divide-slate-100">
                  {data.data.map((log) => (
                    <AuditEventRow key={log.id} log={log} highlight={liveFlash && log.id === data.data[0]?.id} />
                  ))}
                </ol>
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  total={data.meta.total}
                  perPage={data.meta.per_page}
                  onChange={setPage}
                  label="événements"
                />
              </>
            )}
          </CardBody>
        </Card>
      </DashboardAnimate>
    </div>
  );
}

function AuditEventRow({ log, highlight }: { log: AuditLog; highlight?: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = actionMeta(log.action);
  const Icon = meta.icon;
  const portal = portalMeta(log.portal);
  const PortalIcon = portal.icon;
  const expandable = hasDiff(log) || Boolean(log.user_agent) || Boolean(log.request_path);

  return (
    <li
      className={cn(
        "relative px-4 py-4 transition sm:px-5",
        highlight && "bg-emerald-50/60",
        open && "bg-slate-50/80",
      )}
    >
      <div className="flex gap-3 sm:gap-4">
        <span
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
            meta.tone,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold", meta.tone)}>
              {log.action}
            </span>
            <Badge tone={portal.tone} className="gap-1">
              <PortalIcon className="h-3 w-3" />
              {portal.label}
            </Badge>
            <time className="text-[11px] text-slate-400" title={formatDateTime(log.created_at)}>
              {formatRelative(log.created_at)}
            </time>
          </div>

          <p className="mt-1.5 text-sm font-medium text-slate-900">{log.description ?? "Événement sans description"}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.user?.name ?? "Système"}
              {log.user?.role?.name ? (
                <span className="text-slate-400">· {log.user.role.name}</span>
              ) : null}
            </span>
            {log.subject_type ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {log.subject_type}
                {log.subject_id ? ` #${log.subject_id}` : ""}
              </span>
            ) : null}
            {log.ip_address ? <span className="font-mono text-[11px]">{log.ip_address}</span> : null}
            {log.request_path ? (
              <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">{log.request_path}</span>
            ) : null}
          </div>

          {expandable ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
            >
              <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
              {open ? "Masquer les détails" : "Voir les détails"}
            </button>
          ) : null}

          {open ? (
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <DiffBlock title="Avant" values={log.old_values} tone="old" />
                <DiffBlock title="Après" values={log.new_values} tone="new" />
              </div>
              {log.user?.email ? (
                <p className="text-[11px] text-slate-500">
                  Compte : <span className="font-mono">{log.user.email}</span>
                </p>
              ) : null}
              {log.user_agent ? (
                <p className="break-all font-mono text-[10px] leading-relaxed text-slate-400">{log.user_agent}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}
