"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { ActivityForm } from "@/components/activities/activity-form";
import { ActivityStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced, useReferences } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Activity, Paginated } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ActivitiesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.activitiesView}>
      <ActivitiesList />
    </RequirePermission>
  );
}

function ActivitiesList() {
  const toast = useToast();
  const references = useReferences();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tab, setTab] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(q);
  const { data, loading, error, reload } = useApi<Paginated<Activity>>("/activities", {
    page,
    q: debounced,
    type: type || undefined,
    tab: tab || undefined,
    per_page: 20,
  });

  async function removeActivity() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const response = await api.delete<{ message: string }>(`/activities/${deleteTarget.id}`);
      toast.success(response.message);
      setDeleteTarget(null);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Mobilisation" }, { label: "Activités" }]} />
      <PageHeader
        title="Activités"
        description="Réunions, formations, campagnes et missions."
        actions={
          <Can permission={PERMISSIONS.activitiesManage}>
            <Button onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus className="h-4 w-4" />
              Nouvelle activité
            </Button>
          </Can>
        }
      />

      <Tabs
        tabs={[
          { id: "", label: "Toutes" },
          { id: "upcoming", label: "À venir" },
          { id: "completed", label: "Terminées" },
          { id: "drafts", label: "Brouillons" },
        ]}
        value={tab}
        onChange={(id) => { setTab(id); setPage(1); }}
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <Input
            placeholder="Rechercher…"
            value={q}
            onChange={(event) => { setQ(event.target.value); setPage(1); }}
            wrapperClassName="min-w-[12rem] flex-1"
          />
          <Select
            placeholder="Type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={references?.activity_types ?? []}
            wrapperClassName="w-44"
          />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        {loading && <TableSkeleton />}
        {!loading && data?.data.length === 0 && <EmptyState title="Aucune activité" />}
        {!loading && data && data.data.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Activité</Th>
                  <Th>Type</Th>
                  <Th>Date</Th>
                  <Th>Présences</Th>
                  <Th>Statut</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((activity) => (
                  <Tr key={activity.id}>
                    <Td>
                      <Link href={`/activites/${activity.id}`} className="font-medium hover:text-brand-700">
                        {activity.title}
                      </Link>
                      <p className="font-mono text-[11px] text-slate-400">{activity.code}</p>
                    </Td>
                    <Td>{activity.type_label}</Td>
                    <Td className="text-xs">{formatDateTime(activity.starts_at)}</Td>
                    <Td className="text-xs tabular-nums">
                      {activity.attendances_count ?? 0}/{activity.participants_count ?? 0}
                    </Td>
                    <Td>
                      <ActivityStatusBadge status={activity.status} label={activity.status_label} />
                    </Td>
                    <Td>
                      <Can permission={PERMISSIONS.activitiesManage}>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditing(activity); setOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(activity)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
              label="activités"
            />
          </>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier l'activité" : "Nouvelle activité"}
        size="lg"
      >
        <ActivityForm
          key={editing?.id ?? "new"}
          initial={editing}
          submitLabel={editing ? "Enregistrer" : "Créer l'activité"}
          onSaved={(_, message) => {
            toast.success(message);
            setOpen(false);
            reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void removeActivity()}
        loading={busy}
        title="Supprimer cette activité ?"
        message="Cette action est définitive. La feuille de présence associée sera perdue."
        confirmLabel="Supprimer"
        tone="danger"
      />
    </div>
  );
}
