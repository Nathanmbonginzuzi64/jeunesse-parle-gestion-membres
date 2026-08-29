"use client";

import { useMemo, useState } from "react";
import { Fingerprint, KeyRound, Pencil, Plus, Shield, UserCheck, UserX, Users } from "lucide-react";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { UsersHero } from "@/components/users/users-hero";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { AuthUser, Paginated } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";

export default function UsersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <UsersList />
    </RequirePermission>
  );
}

function UsersList() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [disableTarget, setDisableTarget] = useState<AuthUser | null>(null);
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(q);
  const { data, loading, error, reload } = useApi<Paginated<AuthUser>>("/users", { page, q: debounced });

  const kpis = useMemo(() => {
    const list = data?.data ?? [];
    return {
      total: data?.meta.total ?? list.length,
      active: list.filter((u) => u.is_active).length,
      withBiometry: list.filter((u) => u.fingerprint_enrolled).length,
      disabled: list.filter((u) => !u.is_active).length,
    };
  }, [data]);

  async function disableUser() {
    if (!disableTarget) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/users/${disableTarget.id}/disable`);
      toast.success(response.message);
      setDisableTarget(null);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function resetAccess() {
    if (!resetTarget) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/users/${resetTarget.id}/reset-password`);
      toast.success(response.message);
      setResetTarget(null);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Administration" }, { label: "Utilisateurs" }]} />

      <DashboardAnimate>
        <UsersHero
          total={kpis.total}
          active={kpis.active}
          withBiometry={kpis.withBiometry}
          disabled={kpis.disabled}
        />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Comptes" value={kpis.total} icon={Users} tone="info" />
          <KpiCard label="Actifs" value={kpis.active} icon={UserCheck} tone="success" />
          <KpiCard label="Biométrie" value={kpis.withBiometry} icon={Fingerprint} tone="warning" />
          <KpiCard label="Désactivés" value={kpis.disabled} icon={Shield} tone="danger" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Gestion des accès et enregistrement biométrique</p>
          <Can permission={PERMISSIONS.usersManage}>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouveau compte
            </Button>
          </Can>
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={140}>
        <Card>
          <CardHeader title="Registre des comptes" description="Administrateurs et agents territoriaux" />
          <div className="border-b border-slate-100 px-4 pb-4">
            <Input
              placeholder="Nom, e-mail, téléphone…"
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
            {!loading && data?.data.length === 0 && <EmptyState title="Aucun utilisateur" />}
            {!loading && data && data.data.length > 0 && (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>Utilisateur</Th>
                      <Th>Rôle</Th>
                      <Th>Périmètre</Th>
                      <Th>Biométrie</Th>
                      <Th>Dernière connexion</Th>
                      <Th>Statut</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((user) => (
                      <Tr key={user.id}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar src={user.photo_url} name={user.name} size="sm" />
                            <span>
                              <span className="block font-medium">{user.name}</span>
                              <span className="text-xs text-slate-500">{user.email ?? user.phone}</span>
                            </span>
                          </div>
                        </Td>
                        <Td>{user.role?.name}</Td>
                        <Td className="text-xs">{user.scope.province ?? "National"}</Td>
                        <Td>
                          {user.fingerprint_enrolled ? (
                            <Badge tone="success" className="gap-1">
                              <Fingerprint className="h-3 w-3" />
                              6/6
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">Non configurée</span>
                          )}
                        </Td>
                        <Td className="text-xs text-slate-500">
                          {user.last_login_at ? formatRelative(user.last_login_at) : "—"}
                        </Td>
                        <Td>
                          <Badge tone={user.is_active ? "success" : "danger"}>
                            {user.is_active ? "Actif" : "Désactivé"}
                          </Badge>
                        </Td>
                        <Td>
                          <Can permission={PERMISSIONS.usersManage}>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Modifier"
                                onClick={() => {
                                  setEditing(user);
                                  setOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" aria-label="Réinitialiser" onClick={() => setResetTarget(user)}>
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              {user.is_active && (
                                <Button variant="ghost" size="icon" aria-label="Désactiver" onClick={() => setDisableTarget(user)}>
                                  <UserX className="h-4 w-4" />
                                </Button>
                              )}
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
                  label="utilisateurs"
                />
              </>
            )}
          </CardBody>
        </Card>
      </DashboardAnimate>

      <UserFormDialog
        open={open}
        user={editing}
        onClose={() => setOpen(false)}
        onSaved={(message) => {
          toast.success(message);
          reload();
        }}
      />

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => void disableUser()}
        loading={busy}
        title="Désactiver ce compte ?"
        message={`${disableTarget?.name} ne pourra plus se connecter (mot de passe ni empreinte).`}
        confirmLabel="Désactiver"
        tone="danger"
      />
      <ConfirmDialog
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        onConfirm={() => void resetAccess()}
        loading={busy}
        title="Réinitialiser l'accès ?"
        message={`Un lien de réinitialisation sera envoyé à ${resetTarget?.email ?? resetTarget?.phone}.`}
        confirmLabel="Envoyer"
      />
    </div>
  );
}
