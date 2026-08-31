"use client";

import { BarChart3, Bell, CheckCheck, Users } from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { RequirePermission } from "@/components/auth/require-permission";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { cn, formatNumber } from "@/lib/utils";

interface NotificationStats {
  summary: {
    sent: number;
    read: number;
    read_rate: number;
    active_users: number;
  };
  by_type: Array<{ type: string; total: number }>;
  by_day: Array<{ day: string; total: number }>;
  logs: Array<{
    id: number;
    type: string;
    channel: string;
    status: string;
    recipient_label: string | null;
    sent_at: string | null;
    created_at: string | null;
  }>;
}

export default function NotificationStatsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <NotificationAdminDashboard />
    </RequirePermission>
  );
}

function NotificationAdminDashboard() {
  const stats = useApi<NotificationStats>("/notifications/stats");

  if (stats.loading && !stats.data) return <PageLoader />;

  const data = stats.data;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/statistiques", label: "Statistiques" },
          { href: "/notifications", label: "Notifications" },
          { label: "Pilotage admin" },
        ]}
      />

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard notifications</h1>
        <p className="mt-1 text-sm text-slate-500">Statistiques des 30 derniers jours — envois, lectures et audit.</p>
      </div>

      {stats.error ? <Alert tone="error">{stats.error}</Alert> : null}

      {summary ? (
        <>
          <DashboardAnimate>
            <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
              <KpiCard label="Envoyées" value={formatNumber(summary.sent)} icon={Bell} tone="info" />
              <KpiCard label="Lues" value={formatNumber(summary.read)} icon={CheckCheck} tone="success" />
              <KpiCard label="Taux de lecture" value={`${summary.read_rate} %`} icon={BarChart3} tone="warning" />
              <KpiCard label="Utilisateurs actifs" value={formatNumber(summary.active_users)} icon={Users} tone="neutral" />
            </div>
          </DashboardAnimate>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Types les plus fréquents" />
              <CardBody>
                <ul className="space-y-2">
                  {(data?.by_type ?? []).map((row) => (
                    <li key={row.type} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{row.type.replaceAll("_", " ")}</span>
                      <span className="font-semibold tabular-nums text-brand-700">{row.total}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Évolution quotidienne" />
              <CardBody>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {(data?.by_day ?? []).map((row) => (
                    <li key={row.day} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{row.day}</span>
                      <span className="font-medium tabular-nums">{row.total}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Journal d'audit (derniers envois)" description="Canal, statut et destinataire" />
            <CardBody className="overflow-x-auto p-0">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Canal</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Destinataire</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data?.logs ?? []).map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3">{log.type}</td>
                      <td className="px-4 py-3">{log.channel}</td>
                      <td className="px-4 py-3">{log.status}</td>
                      <td className="px-4 py-3">{log.recipient_label ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500">{log.sent_at ?? log.created_at ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
