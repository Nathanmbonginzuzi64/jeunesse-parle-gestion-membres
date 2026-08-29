"use client";

import { useMemo, useState } from "react";
import { Check, KeyRound, Shield, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { RolesHero } from "@/components/roles/roles-hero";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { permissionLabel, scopeLevelLabel } from "@/lib/permission-labels";
import { PERMISSIONS } from "@/lib/permissions";
import type { RoleDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function RolesPage() {
  return (
    <RequirePermission permission={[PERMISSIONS.rolesManage, PERMISSIONS.usersView]}>
      <RolesContent />
    </RequirePermission>
  );
}

function RolesContent() {
  const { data, loading, error } = useApi<{ data: RoleDetail[] }>("/roles");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const roles = data?.data ?? [];

  const kpis = useMemo(() => {
    const allPermissions = new Set(roles.flatMap((role) => role.permissions));
    return {
      roles: roles.length,
      users: roles.reduce((sum, role) => sum + role.users_count, 0),
      permissions: allPermissions.size,
      national: roles.filter((role) => role.scope_level <= 0).length,
    };
  }, [roles]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.slug.toLowerCase().includes(query) ||
        (role.description ?? "").toLowerCase().includes(query) ||
        role.permissions.some((p) => p.toLowerCase().includes(query) || permissionLabel(p).toLowerCase().includes(query)),
    );
  }, [roles, q]);

  const selected = filtered.find((role) => role.id === selectedId) ?? filtered[0] ?? null;

  if (loading) return <PageLoader />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/utilisateurs", label: "Administration" }, { label: "Rôles" }]} />

      <DashboardAnimate>
        <RolesHero roles={kpis.roles} users={kpis.users} permissions={kpis.permissions} />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Rôles" value={kpis.roles} icon={Shield} tone="info" />
          <KpiCard label="Comptes assignés" value={kpis.users} icon={Users} tone="success" />
          <KpiCard label="Permissions" value={kpis.permissions} icon={KeyRound} tone="warning" />
          <KpiCard label="Niveau national" value={kpis.national} icon={Shield} tone="neutral" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Consultation des droits — la modification fine reste côté serveur.</p>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Rechercher un rôle ou une permission…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </DashboardAnimate>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun rôle trouvé" description="Modifiez votre recherche." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
          <DashboardAnimate delay={120}>
            <Card className="overflow-hidden">
              <CardHeader title="Profils" description={`${filtered.length} rôle(s)`} />
              <CardBody className="space-y-1 p-2">
                {filtered.map((role) => {
                  const active = selected?.id === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedId(role.id)}
                      className={cn(
                        "flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition",
                        active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="text-sm font-medium text-slate-900">{role.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>{role.users_count} utilisateur{role.users_count > 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{scopeLevelLabel(role.scope_level)}</span>
                      </span>
                    </button>
                  );
                })}
              </CardBody>
            </Card>
          </DashboardAnimate>

          <DashboardAnimate delay={160}>
            {selected && <RoleDetailPanel role={selected} />}
          </DashboardAnimate>
        </div>
      )}
    </div>
  );
}

function RoleDetailPanel({ role }: { role: RoleDetail }) {
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const permission of role.permissions) {
      const group = permission.split(".")[0] ?? "autre";
      const list = map.get(group) ?? [];
      list.push(permission);
      map.set(group, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [role.permissions]);

  return (
    <Card>
      <CardHeader
        title={role.name}
        description={role.description ?? role.slug}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{scopeLevelLabel(role.scope_level)}</Badge>
            <Badge tone="neutral">{role.permissions.length} permission(s)</Badge>
          </div>
        }
      />
      <CardBody className="space-y-5">
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 ring-1 ring-slate-100">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            {role.users_count} compte{role.users_count > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 font-mono text-xs ring-1 ring-slate-100">
            {role.slug}
          </span>
        </div>

        {role.permissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
            Aucune permission applicative — accès limité à l&apos;espace membre.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([group, permissions]) => (
              <div key={group}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {group}
                </h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {permissions.map((permission) => (
                    <li
                      key={permission}
                      className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>
                        <span className="block font-medium">{permissionLabel(permission)}</span>
                        <span className="font-mono text-[10px] text-slate-400">{permission}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
