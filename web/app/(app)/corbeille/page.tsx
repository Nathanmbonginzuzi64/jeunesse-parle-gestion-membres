"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr, Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/utils";

type TrashRow = {
  id: number;
  module: string;
  label: string;
  subject_type: string;
  subject_id: number;
  deleted_by_name: string | null;
  created_at: string | null;
};

type TrashResponse = {
  data: TrashRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  modules: string[];
};

const MODULE_LABELS: Record<string, string> = {
  members: "Membres",
  users: "Utilisateurs",
  activities: "Activités",
  structures: "Structures",
  news: "Actualités",
  news_comments: "Commentaires",
  home_posts: "Posts accueil",
  jp_messages: "JP Message",
  chat: "Chat",
};

export default function CorbeillePage() {
  const toast = useToast();
  const { can, hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLE_SLUGS.superAdmin);
  const [q, setQ] = useState("");
  const [module, setModule] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const dq = useDebounced(q, 300);

  const feed = useApi<TrashResponse>("/trash", {
    q: dq || undefined,
    module: module || undefined,
    scope: isSuperAdmin ? "all" : "mine",
    page,
    per_page: 20,
  }, { refreshInterval: false });

  const rows = feed.data?.data ?? [];
  const meta = feed.data?.meta;
  const modules = feed.data?.modules ?? [];

  const moduleOptions = useMemo(
    () => [
      { value: "", label: "Tous les modules" },
      ...modules.map((m) => ({ value: m, label: MODULE_LABELS[m] ?? m })),
    ],
    [modules],
  );

  async function restore(id: number) {
    setBusyId(id);
    try {
      await api.post(`/trash/${id}/restore`);
      toast.success("Élément restauré.");
      feed.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Restauration impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function purge(id: number) {
    if (!confirm("Supprimer définitivement ? Cette action est irréversible.")) return;
    setBusyId(id);
    try {
      await api.delete(`/trash/${id}`);
      toast.success("Élément purgé définitivement.");
      feed.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Purge impossible.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.trashView}>
      <div className="space-y-6">
        <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Corbeille" }]} />
        <DashboardAnimate>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Corbeille</h1>
            <p className="mt-1 text-sm text-slate-600">
              {isSuperAdmin
                ? "Toutes les suppressions du système apparaissent ici. Restaurez ou purgez définitivement."
                : "Retrouvez ici les éléments que vous avez supprimés et restaurez-les si besoin."}
            </p>
          </div>
        </DashboardAnimate>

        <DashboardAnimate delay={60}>
          <Card>
            <CardHeader title="Éléments supprimés" description={`${meta?.total ?? 0} élément(s)`} />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[16rem] flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="search"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Rechercher (libellé, auteur, module…)"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={module}
                  onChange={(e) => {
                    setModule(e.target.value);
                    setPage(1);
                  }}
                  options={moduleOptions}
                />
              </div>

              {feed.error ? <Alert tone="error">{feed.error}</Alert> : null}
              {feed.loading && !feed.data ? <TableSkeleton rows={6} /> : null}

              {!feed.loading && rows.length === 0 ? (
                <EmptyState title="Corbeille vide" description="Aucune suppression à afficher." />
              ) : null}

              {rows.length > 0 ? (
                <div className="-mx-5 overflow-hidden border-t border-slate-200 sm:-mx-5">
                  <Table className="min-w-[48rem]">
                    <thead>
                      <tr>
                        <Th>Élément</Th>
                        <Th>Module</Th>
                        <Th>Supprimé par</Th>
                        <Th>Date</Th>
                        <Th className="text-right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <Tr key={row.id}>
                          <Td>
                            <p className="font-medium text-slate-900">{row.label}</p>
                            <p className="text-[11px] text-slate-500">
                              {row.subject_type} #{row.subject_id}
                            </p>
                          </Td>
                          <Td>
                            <Badge tone="neutral">{MODULE_LABELS[row.module] ?? row.module}</Badge>
                          </Td>
                          <Td className="text-xs">{row.deleted_by_name ?? "—"}</Td>
                          <Td className="whitespace-nowrap text-xs text-slate-500">
                            {row.created_at ? formatDateTime(row.created_at) : "—"}
                          </Td>
                          <Td className="text-right">
                            <div className="flex justify-end gap-2">
                              {(can(PERMISSIONS.trashManage) || isSuperAdmin) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={busyId === row.id}
                                  onClick={() => void restore(row.id)}
                                >
                                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                  Restaurer
                                </Button>
                              )}
                              {isSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="danger"
                                  loading={busyId === row.id}
                                  onClick={() => void purge(row.id)}
                                >
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Purger
                                </Button>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                  {meta ? (
                    <Pagination
                      page={meta.current_page}
                      lastPage={meta.last_page}
                      total={meta.total}
                      perPage={meta.per_page}
                      onChange={setPage}
                      label="éléments"
                    />
                  ) : null}
                </div>
              ) : null}
            </CardBody>
          </Card>
        </DashboardAnimate>
      </div>
    </RequirePermission>
  );
}
