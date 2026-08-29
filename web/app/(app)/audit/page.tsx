"use client";

import { useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  KeyRound,
  LogIn,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { AuditHero } from "@/components/audit/audit-hero";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { AuditLog, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";

const CATEGORIES = [
  { id: "", label: "Tous" },
  { id: "auth", label: "Connexions" },
  { id: "member", label: "Membres" },
  { id: "card", label: "Cartes" },
  { id: "export", label: "Exports" },
  { id: "user", label: "Utilisateurs" },
] as const;

const ACTION_META: Record<
  string,
  { tone: string; icon: typeof Shield; label: string }
> = {
  auth: { tone: "bg-slate-100 text-slate-700", icon: LogIn, label: "Authentification" },
  member: { tone: "bg-brand-100 text-brand-800", icon: UserCheck, label: "Membre" },
  card: { tone: "bg-emerald-100 text-emerald-800", icon: CreditCard, label: "Carte" },
  export: { tone: "bg-amber-100 text-amber-800", icon: Download, label: "Export" },
  user: { tone: "bg-indigo-100 text-indigo-800", icon: KeyRound, label: "Utilisateur" },
};

function actionMeta(action: string) {
  const key = action.split(".")[0] ?? action;
  return ACTION_META[key] ?? { tone: "bg-slate-100 text-slate-700", icon: Shield, label: key };
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
  const [q, setQ] = useState("");
  const debounced = useDebounced(q);
  const { data, loading, error } = useApi<Paginated<AuditLog>>("/audit", {
    page,
    action: category || undefined,
    q: debounced || undefined,
    per_page: 30,
  });

  const kpis = useMemo(() => {
    const list = data?.data ?? [];
    return {
      total: data?.meta.total ?? list.length,
      auth: list.filter((log) => log.action.startsWith("auth.")).length,
      member: list.filter((log) => log.action.startsWith("member.")).length,
      card: list.filter((log) => log.action.startsWith("card.")).length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/parametres", label: "Administration" }, { label: "Journal d'audit" }]} />

      <DashboardAnimate>
        <AuditHero total={kpis.total} today={data?.data.length} />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Événements" value={kpis.total} icon={Shield} tone="info" />
          <KpiCard label="Connexions (page)" value={kpis.auth} icon={LogIn} tone="neutral" />
          <KpiCard label="Membres (page)" value={kpis.member} icon={UserCheck} tone="success" />
          <KpiCard label="Cartes (page)" value={kpis.card} icon={CreditCard} tone="warning" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <Card>
          <CardHeader
            title="Fil d'événements"
            description="Traçabilité des actions sensibles sur la plateforme"
          />
          <div className="space-y-3 border-b border-slate-100 px-4 pb-4">
            <Tabs
              tabs={CATEGORIES.map((item) => ({ id: item.id || "all", label: item.label }))}
              value={category || "all"}
              onChange={(id) => {
                setCategory(id === "all" ? "" : id);
                setPage(1);
              }}
            />
            <Input
              placeholder="Rechercher dans la description, l'action ou l'utilisateur…"
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
            {loading && <TableSkeleton />}
            {!loading && data?.data.length === 0 && <EmptyState title="Aucun événement" />}
            {!loading && data && data.data.length > 0 && (
              <>
                <ol className="relative divide-y divide-slate-100 before:absolute before:inset-y-0 before:left-[1.65rem] before:w-px before:bg-slate-200">
                  {data.data.map((log) => {
                    const meta = actionMeta(log.action);
                    const Icon = meta.icon;
                    return (
                      <li key={log.id} className="relative flex gap-4 px-5 py-4">
                        <span className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
                                meta.tone,
                              )}
                            >
                              {log.action}
                            </span>
                            <time
                              className="text-[11px] text-slate-400"
                              title={formatDateTime(log.created_at)}
                            >
                              {formatRelative(log.created_at)}
                            </time>
                          </div>
                          <p className="mt-1 text-sm text-slate-800">{log.description ?? "—"}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user?.name ?? "Système"}
                            </span>
                            {log.subject_type && (
                              <span>
                                Cible : {log.subject_type}
                                {log.subject_id ? ` #${log.subject_id}` : ""}
                              </span>
                            )}
                            {log.ip_address && <span className="font-mono">{log.ip_address}</span>}
                          </div>
                        </div>
                      </li>
                    );
                  })}
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
