"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, KeyRound, Shield, Trash2, Users } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { RolesHero } from "@/components/roles/roles-hero";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Switch } from "@/components/ui/field";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PERMISSION_GROUPS, permissionLabel, scopeLevelLabel } from "@/lib/permission-labels";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { RoleDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CatalogItem {
  slug: string;
  name: string;
  group: string;
}

const PERMISSIONS_PER_PAGE = 10;

export default function RolesPage() {
  return (
    <RequirePermission permission={[PERMISSIONS.rolesManage, PERMISSIONS.usersView]}>
      <RolesContent />
    </RequirePermission>
  );
}

function RolesContent() {
  const { data, loading, error } = useApi<{ data: RoleDetail[] }>("/roles");
  const catalog = useApi<{ data: CatalogItem[] }>("/permissions");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [roles, setRoles] = useState<RoleDetail[]>([]);

  useEffect(() => {
    if (data?.data) setRoles(data.data);
  }, [data]);

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
          <p className="text-sm text-slate-500">
            Cochez ou retirez une permission : l’enregistrement est immédiat.
          </p>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Rechercher un rôle…"
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
            {selected && (
              <RoleDetailPanel
                key={selected.id}
                role={selected}
                catalog={catalog.data?.data ?? []}
                onUpdated={(updated) => {
                  setRoles((current) => current.map((role) => (role.id === updated.id ? { ...role, ...updated } : role)));
                }}
              />
            )}
          </DashboardAnimate>
        </div>
      )}
    </div>
  );
}

function RoleDetailPanel({
  role,
  catalog,
  onUpdated,
}: {
  role: RoleDetail;
  catalog: CatalogItem[];
  onUpdated: (role: RoleDetail) => void;
}) {
  const toast = useToast();
  const { user, refresh, can, hasRole } = useAuth();
  const canEdit = can(PERMISSIONS.rolesManage) || hasRole(ROLE_SLUGS.superAdmin);
  const locked = role.slug === "super-admin";
  const [busy, setBusy] = useState<string | null>(null);
  const [permissionQuery, setPermissionQuery] = useState("");
  const [page, setPage] = useState(1);

  const catalogSlugs = catalog.length > 0 ? catalog.map((item) => item.slug) : role.permissions;
  const granted = new Set(role.permissions);

  const flatPermissions = useMemo(() => {
    const slugs = catalogSlugs.length > 0 ? catalogSlugs : role.permissions;
    const rows: Array<{ slug: string; groupLabel: string }> = [];
    for (const group of PERMISSION_GROUPS) {
      for (const slug of slugs) {
        if (slug.startsWith(group.prefix) || slug === group.id) {
          rows.push({ slug, groupLabel: group.label });
        }
      }
    }
    const known = new Set(rows.map((row) => row.slug));
    for (const slug of slugs) {
      if (!known.has(slug)) rows.push({ slug, groupLabel: "Autres" });
    }
    return rows;
  }, [catalogSlugs, role.permissions]);

  const filteredPermissions = useMemo(() => {
    const query = permissionQuery.trim().toLowerCase();
    if (!query) return flatPermissions;
    return flatPermissions.filter(
      (item) =>
        item.slug.toLowerCase().includes(query) ||
        item.groupLabel.toLowerCase().includes(query) ||
        permissionLabel(item.slug).toLowerCase().includes(query),
    );
  }, [flatPermissions, permissionQuery]);

  const lastPage = Math.max(1, Math.ceil(filteredPermissions.length / PERMISSIONS_PER_PAGE));
  const currentPage = Math.min(page, lastPage);
  const pageItems = filteredPermissions.slice(
    (currentPage - 1) * PERMISSIONS_PER_PAGE,
    currentPage * PERMISSIONS_PER_PAGE,
  );

  const pageGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of pageItems) {
      if (!map.has(item.groupLabel)) map.set(item.groupLabel, []);
      map.get(item.groupLabel)!.push(item.slug);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [pageItems]);

  useEffect(() => {
    setPage(1);
  }, [role.id, permissionQuery]);

  async function persist(next: string[]) {
    const response = await api.put<{ message: string; data: RoleDetail }>(`/roles/${role.id}/permissions`, {
      permissions: next,
    });
    onUpdated(response.data);
    if (user?.role?.slug === role.slug) await refresh();
    return response.message;
  }

  async function toggle(slug: string, enabled: boolean) {
    if (!canEdit || locked) return;
    const next = enabled
      ? Array.from(new Set([...role.permissions, slug]))
      : role.permissions.filter((item) => item !== slug);
    onUpdated({ ...role, permissions: next });
    setBusy(slug);
    try {
      const message = await persist(next);
      toast.success(message);
    } catch (caught) {
      onUpdated(role);
      toast.error(caught instanceof ApiError ? caught.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(slug: string) {
    if (!canEdit || locked) return;
    const previous = role.permissions;
    onUpdated({ ...role, permissions: previous.filter((item) => item !== slug) });
    setBusy(slug);
    try {
      const response = await api.delete<{ message: string; data: RoleDetail }>(
        `/roles/${role.id}/permissions/${slug}`,
      );
      onUpdated(response.data);
      if (user?.role?.slug === role.slug) await refresh();
      toast.success(response.message);
    } catch (caught) {
      onUpdated({ ...role, permissions: previous });
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(null);
    }
  }

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

        {locked ? (
          <Alert tone="info">Le super administrateur conserve tous les droits. Ce profil n’est pas modifiable.</Alert>
        ) : null}

        {!canEdit ? (
          <p className="text-xs text-slate-500">Consultation uniquement — la modification demande la permission « gérer les rôles ».</p>
        ) : null}

        <Input
          placeholder="Filtrer les permissions (nom ou slug)…"
          value={permissionQuery}
          onChange={(e) => setPermissionQuery(e.target.value)}
        />

        {filteredPermissions.length === 0 ? (
          <EmptyState title="Aucune permission" description="Aucun droit ne correspond à ce filtre." />
        ) : (
          <div className="space-y-4">
            {pageGroups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{group.label}</h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {group.items.map((permission) => {
                    const on = granted.has(permission);
                    return (
                      <li
                        key={permission}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                          on ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-white",
                        )}
                      >
                        {canEdit && !locked ? (
                          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                            <Switch
                              label={permissionLabel(permission)}
                              description={permission}
                              checked={on}
                              onChange={(checked) => void toggle(permission, checked)}
                              className="flex-1"
                            />
                            {on ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Retirer ${permission}`}
                                disabled={busy === permission}
                                onClick={() => void remove(permission)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            ) : null}
                          </div>
                        ) : (
                          <>
                            <Check className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", on ? "text-emerald-600" : "text-slate-300")} />
                            <span>
                              <span className="block font-medium">{permissionLabel(permission)}</span>
                              <span className="font-mono text-[10px] text-slate-400">{permission}</span>
                            </span>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            <Pagination
              page={currentPage}
              lastPage={lastPage}
              total={filteredPermissions.length}
              perPage={PERMISSIONS_PER_PAGE}
              onChange={setPage}
              label="permissions"
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
