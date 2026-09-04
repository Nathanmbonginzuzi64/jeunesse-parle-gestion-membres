"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Layers,
  Map,
  MapPin,
  Network,
  Plus,
  Search,
  Signpost,
  Users,
} from "lucide-react";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { StructureFormDialog } from "@/components/structures/structure-form-dialog";
import { TerritoryFormDialog } from "@/components/structures/territory-form-dialog";
import { StructuresHero } from "@/components/structures/structures-hero";
import { StructuresTable } from "@/components/structures/structures-table";
import { StructuresViewNav, type StructuresView } from "@/components/structures/structures-view-nav";
import { StructureCards, TerritoryTree } from "@/components/structures/territory-tree";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { QuickLinkCard } from "@/components/dashboard/quick-link-card";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Paginated, StatisticsOverview, Structure } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

export default function StructuresPage() {
  return (
    <RequirePermission permission={PERMISSIONS.structuresView}>
      <StructuresHub />
    </RequirePermission>
  );
}

function StructuresHub() {
  const toast = useToast();
  const { can } = useAuth();
  const stats = useApi<StatisticsOverview>(
    can(PERMISSIONS.statisticsView) ? "/statistics" : null,
  );
  const [view, setView] = useState<StructuresView>("tree");
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
  const [territoryKind, setTerritoryKind] = useState<"province" | "city" | "district" | "commune" | "quartier" | "avenue" | null>(null);
  const [disableTarget, setDisableTarget] = useState<Structure | null>(null);
  const [busy, setBusy] = useState(false);

  const kpis = stats.data?.kpis;
  const activeCount = useMemo(
    () => data?.data.filter((structure) => structure.is_active).length ?? 0,
    [data?.data],
  );
  const membersAttached = useMemo(
    () => data?.data.reduce((acc, structure) => acc + (structure.members_count ?? 0), 0) ?? 0,
    [data?.data],
  );

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

  function openCreateStructure() {
    setEditing(null);
    setStructureOpen(true);
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Structures" }]} />

      <DashboardAnimate>
        <StructuresHero
          structuresCount={kpis?.coverage.structures ?? data?.meta.total}
          provincesCount={kpis?.coverage.provinces}
          citiesCount={kpis?.coverage.cities}
          districtsCount={kpis?.coverage.districts}
          quartiersCount={kpis?.coverage.quartiers}
          avenuesCount={kpis?.coverage.avenues}
        />
      </DashboardAnimate>

      {kpis && (
        <DashboardAnimate delay={60}>
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7")}>
            <KpiCard label="Structures" value={kpis.coverage.structures} icon={Building2} tone="info" />
            <KpiCard label="Provinces" value={kpis.coverage.provinces} icon={MapPin} tone="info" href="/cartographie" />
            <KpiCard label="Villes" value={kpis.coverage.cities} icon={Network} tone="neutral" />
            <KpiCard label="Districts" value={kpis.coverage.districts} icon={Layers} tone="neutral" />
            <KpiCard label="Quartiers" value={kpis.coverage.quartiers} icon={MapPin} tone="neutral" />
            <KpiCard label="Avenues" value={kpis.coverage.avenues} icon={Signpost} tone="neutral" />
            <KpiCard label="Membres" value={kpis.members.total} icon={Users} tone="success" href="/membres" />
          </div>
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={100}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StructuresViewNav value={view} onChange={setView} resultCount={data?.meta.total} />
          <Can permission={PERMISSIONS.structuresManage}>
            <div className="flex flex-wrap gap-2">
              <Can permission={PERMISSIONS.territoriesManage}>
                <Button variant="outline" size="sm" onClick={() => setTerritoryKind("province")}>
                  <MapPin className="h-4 w-4" />
                  Province
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTerritoryKind("city")}>
                  <Network className="h-4 w-4" />
                  Ville
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTerritoryKind("district")}>
                  <Network className="h-4 w-4" />
                  District
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTerritoryKind("commune")}>
                  <Building2 className="h-4 w-4" />
                  Commune
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTerritoryKind("quartier")}>
                  <MapPin className="h-4 w-4" />
                  Quartier
                </Button>
                <Button variant="outline" size="sm" onClick={() => setTerritoryKind("avenue")}>
                  <Signpost className="h-4 w-4" />
                  Avenue
                </Button>
              </Can>
              <Button size="sm" onClick={openCreateStructure}>
                <Plus className="h-4 w-4" />
                Nouvelle structure
              </Button>
            </div>
          </Can>
        </div>
      </DashboardAnimate>

      {view === "tree" && (
        <DashboardAnimate delay={140}>
          <Card>
            <CardHeader title="Arbre territorial" description="Province → ville → district → commune → quartier → avenue → structure" />
            <CardBody>
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
            </CardBody>
          </Card>
        </DashboardAnimate>
      )}

      {(view === "table" || view === "cards") && (
        <DashboardAnimate delay={140}>
          <Card>
            <CardHeader
              title={view === "table" ? "Registre des structures" : "Cartes des structures"}
              description={
                loading
                  ? "Chargement…"
                  : `${formatNumber(data?.meta.total ?? 0)} structure(s) · ${formatNumber(activeCount)} active(s) sur cette page`
              }
            />
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher une structure, un code…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            {error && <Alert tone="error" className="m-4">{error}</Alert>}
            {loading && <TableSkeleton />}
            {!loading && data?.data.length === 0 && (
              <EmptyState
                title="Aucune structure"
                description="Aucune structure ne correspond à votre recherche."
                action={
                  <Can permission={PERMISSIONS.structuresManage}>
                    <Button size="sm" onClick={openCreateStructure}>
                      <Plus className="h-4 w-4" />
                      Créer une structure
                    </Button>
                  </Can>
                }
              />
            )}
            {!loading && data && data.data.length > 0 && view === "cards" && (
              <>
                <CardBody>
                  <StructureCards
                    structures={data.data}
                    onEdit={(structure) => {
                      setEditing(structure);
                      setStructureOpen(true);
                    }}
                    onDisable={setDisableTarget}
                  />
                  <p className="mt-4 text-xs text-slate-500">
                    {formatNumber(membersAttached)} membres rattachés aux structures affichées
                  </p>
                </CardBody>
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
            {!loading && data && data.data.length > 0 && view === "table" && (
              <StructuresTable
                data={data}
                onEdit={(structure) => {
                  setEditing(structure);
                  setStructureOpen(true);
                }}
                onPageChange={setPage}
              />
            )}
          </Card>
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={180}>
        <DashboardSection icon={Layers} title="Raccourcis" description="Pilotage territorial et mobilisation" tone="brand">
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
            <QuickLinkCard href="/cartographie" icon={Map} title="Cartographie" description="Vue géographique des provinces" tone="brand" />
            <QuickLinkCard href="/membres" icon={Users} title="Membres" description="Registre filtrable par structure" tone="emerald" />
            <QuickLinkCard href="/statistiques" icon={BarChart3} title="Statistiques" description="Indicateurs de couverture" tone="slate" />
            <QuickLinkCard href="/activites" icon={Building2} title="Activités" description="Mobilisation par antenne" tone="amber" />
          </div>
        </DashboardSection>
      </DashboardAnimate>

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
