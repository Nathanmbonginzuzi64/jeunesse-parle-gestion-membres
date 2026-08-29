"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, MapPin, Building2, Network } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { StructureFormDialog } from "@/components/structures/structure-form-dialog";
import { TerritoryFormDialog } from "@/components/structures/territory-form-dialog";
import { StructureCards, TerritoryTree } from "@/components/structures/territory-tree";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Paginated, Structure } from "@/lib/types";

export default function StructuresPage() {
  return (
    <RequirePermission permission={PERMISSIONS.structuresView}>
      <StructuresHub />
    </RequirePermission>
  );
}

function StructuresHub() {
  const toast = useToast();
  const [view, setView] = useState("tree");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const debounced = useDebounced(q);
  const { data, loading, error, reload } = useApi<Paginated<Structure>>("/structures", {
    page,
    q: debounced,
    per_page: 25,
  });
  const tree = useApi<{ data: unknown[] }>("/territories/tree");

  const [structureOpen, setStructureOpen] = useState(false);
  const [editing, setEditing] = useState<Structure | null>(null);
  const [territoryKind, setTerritoryKind] = useState<"province" | "city" | "commune" | null>(null);
  const [disableTarget, setDisableTarget] = useState<Structure | null>(null);
  const [busy, setBusy] = useState(false);

  async function disableStructure() {
    if (!disableTarget) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/structures/${disableTarget.id}/disable`);
      toast.success(response.message);
      setDisableTarget(null);
      reload();
      tree.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Structures" }]} />
      <PageHeader
        title="Structures & territoires"
        description="Provinces, villes, communes et structures de mobilisation."
        actions={
          <Can permission={PERMISSIONS.structuresManage}>
            <div className="flex flex-wrap gap-2">
              <Can permission={PERMISSIONS.territoriesManage}>
                <Button variant="outline" onClick={() => setTerritoryKind("province")}>
                  <MapPin className="h-4 w-4" />
                  Province
                </Button>
                <Button variant="outline" onClick={() => setTerritoryKind("city")}>
                  <Network className="h-4 w-4" />
                  Ville
                </Button>
                <Button variant="outline" onClick={() => setTerritoryKind("commune")}>
                  <Building2 className="h-4 w-4" />
                  Commune
                </Button>
              </Can>
              <Button
                onClick={() => {
                  setEditing(null);
                  setStructureOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Structure
              </Button>
            </div>
          </Can>
        }
      />

      <Tabs
        tabs={[
          { id: "tree", label: "Arbre territorial" },
          { id: "table", label: "Tableau" },
          { id: "cards", label: "Cartes" },
        ]}
        value={view}
        onChange={setView}
      />

      {view === "tree" && (
        <Card className="p-4">
          {tree.loading && <TableSkeleton />}
          {tree.error && <Alert tone="error">{tree.error}</Alert>}
          {tree.data?.data && (
            <TerritoryTree
              data={tree.data.data as Parameters<typeof TerritoryTree>[0]["data"]}
              onSelectStructure={(structure) => {
                setEditing(structure);
                setStructureOpen(true);
              }}
            />
          )}
        </Card>
      )}

      {(view === "table" || view === "cards") && (
        <Card>
          <div className="border-b border-slate-200 p-4">
            <Input placeholder="Rechercher…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          {loading && <TableSkeleton />}
          {!loading && data?.data.length === 0 && <EmptyState title="Aucune structure" />}
          {!loading && data && data.data.length > 0 && view === "cards" && (
            <div className="p-4">
              <StructureCards
                structures={data.data}
                onEdit={(structure) => {
                  setEditing(structure);
                  setStructureOpen(true);
                }}
                onDisable={setDisableTarget}
              />
            </div>
          )}
          {!loading && data && data.data.length > 0 && view === "table" && (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Structure</Th>
                    <Th>Type</Th>
                    <Th>Localisation</Th>
                    <Th>Membres</Th>
                    <Th>Statut</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((structure) => (
                    <Tr key={structure.id}>
                      <Td>
                        <p className="font-medium">{structure.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{structure.code}</p>
                      </Td>
                      <Td className="text-xs">{structure.type.replaceAll("_", " ")}</Td>
                      <Td className="text-xs">
                        {structure.province?.name}
                        {structure.city ? ` · ${structure.city.name}` : ""}
                      </Td>
                      <Td>{structure.members_count ?? 0}</Td>
                      <Td>
                        <Badge tone={structure.is_active ? "success" : "neutral"}>
                          {structure.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </Td>
                      <Td>
                        <div className="flex gap-2 text-xs">
                          <Link href={`/membres?structure_id=${structure.id}`} className="text-brand-700">
                            Membres
                          </Link>
                          <Can permission={PERMISSIONS.structuresManage}>
                            <button type="button" className="text-slate-600" onClick={() => { setEditing(structure); setStructureOpen(true); }}>
                              Modifier
                            </button>
                          </Can>
                        </div>
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
                label="structures"
              />
            </>
          )}
        </Card>
      )}

      <StructureFormDialog
        open={structureOpen}
        structure={editing}
        onClose={() => setStructureOpen(false)}
        onSaved={(message) => {
          toast.success(message);
          reload();
          tree.reload();
        }}
      />

      {territoryKind && (
        <TerritoryFormDialog
          open
          kind={territoryKind}
          onClose={() => setTerritoryKind(null)}
          onSaved={(message) => {
            toast.success(message);
            tree.reload();
            setTerritoryKind(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(disableTarget)}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => void disableStructure()}
        loading={busy}
        title="Désactiver cette structure ?"
        message="Les membres restent rattachés mais la structure n'apparaîtra plus dans les sélections actives."
        confirmLabel="Désactiver"
        tone="danger"
      />
    </div>
  );
}
