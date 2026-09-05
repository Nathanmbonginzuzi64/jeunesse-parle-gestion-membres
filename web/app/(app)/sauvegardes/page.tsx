"use client";

import { useState } from "react";
import { Archive, Download, HardDrive, Trash2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr, Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, API_BASE_URL, getToken } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";

type BackupRow = {
  id: number;
  code: string;
  filename: string;
  status: string;
  size_label: string;
  tables_count: number;
  rows_count: number;
  checksum: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
};

type BackupResponse = {
  data: BackupRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

export default function SauvegardesPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const feed = useApi<BackupResponse>("/backups", { page, per_page: 15 }, { refreshInterval: false });
  const rows = feed.data?.data ?? [];
  const meta = feed.data?.meta;

  async function createBackup() {
    setCreating(true);
    try {
      await api.post("/backups", { notes: "Sauvegarde manuelle SuperAdmin" });
      toast.success("Sauvegarde créée.");
      feed.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Création impossible.");
    } finally {
      setCreating(false);
    }
  }

  async function downloadBackup(row: BackupRow) {
    setBusyId(row.id);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/backups/${row.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error("Téléchargement impossible.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Téléchargement démarré.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Téléchargement impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeBackup(id: number) {
    if (!confirm("Supprimer cette sauvegarde du serveur ?")) return;
    setBusyId(id);
    try {
      await api.delete(`/backups/${id}`);
      toast.success("Sauvegarde supprimée.");
      feed.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.backupManage}>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { href: "/tableau-de-bord", label: "Pilotage" },
            { label: "Sauvegardes" },
          ]}
        />

        <DashboardAnimate>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Sauvegardes système</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Archivez toutes les données métier (membres, activités, cartes, messages…) pour pouvoir
                les récupérer en cas d&apos;incident.
              </p>
            </div>
            <Button onClick={() => void createBackup()} loading={creating}>
              <HardDrive className="mr-2 h-4 w-4" />
              Créer une sauvegarde
            </Button>
          </div>
        </DashboardAnimate>

        <DashboardAnimate delay={60}>
          <Card>
            <CardHeader
              title="Historique des sauvegardes"
              description="Fichiers ZIP JSON stockés sur le serveur"
            />
            <CardBody className="space-y-4">
              {feed.error ? <Alert tone="error">{feed.error}</Alert> : null}
              {feed.loading && !feed.data ? <TableSkeleton rows={5} /> : null}
              {!feed.loading && rows.length === 0 ? (
                <EmptyState
                  title="Aucune sauvegarde"
                  description="Créez la première sauvegarde complète du système."
                />
              ) : null}

              {rows.length > 0 ? (
                <div className="-mx-5 overflow-hidden border-t border-slate-200 sm:-mx-5">
                  <Table className="min-w-[52rem]">
                    <thead>
                      <tr>
                        <Th>Code</Th>
                        <Th>Statut</Th>
                        <Th>Volume</Th>
                        <Th>Créée par</Th>
                        <Th>Date</Th>
                        <Th className="text-right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <Tr key={row.id}>
                          <Td>
                            <div className="flex items-center gap-2">
                              <Archive className="h-4 w-4 text-slate-400" />
                              <div>
                                <p className="font-mono text-xs font-semibold text-slate-900">{row.code}</p>
                                <p className="text-[11px] text-slate-500">{row.filename}</p>
                              </div>
                            </div>
                          </Td>
                          <Td>
                            <Badge tone={row.status === "ready" ? "success" : row.status === "failed" ? "danger" : "warning"}>
                              {row.status}
                            </Badge>
                          </Td>
                          <Td className="text-xs text-slate-600">
                            {row.size_label}
                            <span className="mt-0.5 block text-[11px] text-slate-400">
                              {formatNumber(row.tables_count)} tables · {formatNumber(row.rows_count)} lignes
                            </span>
                          </Td>
                          <Td className="text-xs">{row.created_by ?? "Système"}</Td>
                          <Td className="whitespace-nowrap text-xs text-slate-500">
                            {row.created_at ? formatDateTime(row.created_at) : "—"}
                          </Td>
                          <Td className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={row.status !== "ready"}
                                loading={busyId === row.id}
                                onClick={() => void downloadBackup(row)}
                              >
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                Télécharger
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                loading={busyId === row.id}
                                onClick={() => void removeBackup(row.id)}
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Supprimer
                              </Button>
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
                      label="sauvegardes"
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
