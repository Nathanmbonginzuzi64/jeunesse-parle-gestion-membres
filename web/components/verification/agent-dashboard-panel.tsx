"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BadgeCheck, ScanLine, UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AgentDashboard = {
  kpis: {
    verifications_today: number;
    valid_today: number;
    rejected_today: number;
    presents_today: number;
    verifications_week: number;
    presents_week: number;
    members_verified: number;
  };
  chart: {
    labels: string[];
    verifications: number[];
    valid: number[];
    presents: number[];
  };
  agent: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    photo_url: string | null;
    role: string | null;
    member_code: string | null;
    member_id: number | null;
  };
};

export function AgentDashboardPanel() {
  const { user } = useAuth();
  const dash = useApi<AgentDashboard>("/agent/dashboard", {}, {
    refreshInterval: 2_500,
  });

  if (!dash.data && dash.loading) return null;
  if (!dash.data) return null;

  const { kpis, chart, agent } = dash.data;
  const series = chart.labels.map((label, index) => ({
    label,
    verifications: chart.verifications[index] ?? 0,
    presents: chart.presents[index] ?? 0,
    valid: chart.valid[index] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Profil agent" description="Identité et statistiques terrain" />
        <CardBody>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar
              src={agent.photo_url ?? user?.photo_url}
              name={agent.name}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-slate-900">{agent.name}</p>
              <p className="text-sm text-brand-700">{agent.role ?? user?.role?.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[agent.member_code, agent.email, agent.phone].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
        <KpiCard label="Vérifs aujourd’hui" value={kpis.verifications_today} icon={ScanLine} tone="info" />
        <KpiCard label="Valides" value={kpis.valid_today} icon={BadgeCheck} tone="success" />
        <KpiCard label="Présents" value={kpis.presents_today} icon={UserCheck} tone="neutral" />
        <KpiCard label="Membres vérifiés" value={kpis.members_verified} icon={Users} tone="info" />
      </div>

      <Card>
        <CardHeader title="Activité 7 jours" description="Vérifications et présences" />
        <CardBody className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="verifications" name="Vérifs" fill="#0B7AB8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="presents" name="Présences" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
    </div>
  );
}
