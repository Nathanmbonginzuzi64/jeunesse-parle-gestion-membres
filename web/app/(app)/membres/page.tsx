"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Download,
  Filter,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { MemberPreviewDrawer } from "@/components/members/member-preview-drawer";
import { MembersTable } from "@/components/members/members-table";
import {
  getMemberStatusView,
  MembersHero,
} from "@/components/members/members-status-nav";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { RequirePermission, Can } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/modal";
import { TerritorySelect } from "@/components/forms/territory-select";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, downloadFile, ApiError } from "@/lib/api";
import { useApi, useDebounced, useReferences } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { Member, Paginated, StatisticsOverview } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

const EMPTY_BY_STATUS: Record<string, { title: string; description: string }> = {
  "": { title: "Aucun membre", description: "Le registre est vide pour ce périmètre." },
  active: { title: "Aucun membre actif", description: "Aucun dossier validé ne correspond aux filtres." },
  pending: { title: "Aucun dossier en attente", description: "Toutes les inscriptions ont été traitées." },
  suspended: { title: "Aucun membre suspendu", description: "Aucune suspension en cours sur ce périmètre." },
};

export default function MembersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.membersView}>
      <Suspense fallback={<TableSkeleton />}>
        <MembersList />
      </Suspense>
    </RequirePermission>
  );
}

function MembersList() {
  const toast = useToast();
  const router = useRouter();
  const references = useReferences();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const view = getMemberStatusView(statusFilter);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState("");
  const [profession, setProfession] = useState("");
  const [skill, setSkill] = useState("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("created_at");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });
  const [advanced, setAdvanced] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [preview, setPreview] = useState<Member | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [statusFilter]);

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setEditing(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  const debouncedQ = useDebounced(q);
  const query = useMemo(
    () => ({
      page,
      q: debouncedQ,
      status: statusFilter || undefined,
      gender: gender || undefined,
      profession: profession || undefined,
      skill: skill || undefined,
      age_min: ageMin || undefined,
      age_max: ageMax || undefined,
      registered_from: from || undefined,
      registered_to: to || undefined,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      structure_id: searchParams.get("structure_id") ? Number(searchParams.get("structure_id")) : undefined,
      sort,
      direction,
      per_page: 20,
    }),
    [page, debouncedQ, statusFilter, gender, profession, skill, ageMin, ageMax, from, to, territory, sort, direction, searchParams],
  );

  const stats = useApi<StatisticsOverview>("/statistics");
  const { data, loading, error, reload } = useApi<Paginated<Member>>("/members", query);

  function resetFilters() {
    setQ("");
    setGender("");
    setProfession("");
    setSkill("");
    setAgeMin("");
    setAgeMax("");
    setFrom("");
    setTo("");
    setTerritory({ province_id: null, city_id: null, district_id: null, commune_id: null, zone_id: null });
    setPage(1);
  }

  function goToStatus(status: string) {
    router.push(status ? `/membres?status=${status}` : "/membres");
  }

  async function bulkArchive() {
    if (!selected.length) return;
    setBulkBusy(true);
    try {
      const response = await api.post<{ message: string }>("/members/bulk-status", {
        ids: selected,
        status: "archived",
      });
      toast.success(response.message);
      setSelected([]);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? (data?.data.map((member) => member.id) ?? []) : []);
  }

  function toggleSort(column: string) {
    if (sort === column) setDirection((c) => (c === "asc" ? "desc" : "asc"));
    else {
      setSort(column);
      setDirection("asc");
    }
    setPage(1);
  }

  async function exportCsv() {
    try {
      await downloadFile("/members/export", query, "membres.csv");
      toast.success("Export lancé.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Le téléchargement a échoué.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const response = await api.delete<{ message: string }>(`/members/${deleteTarget.id}`);
      toast.success(response.message);
      setSelected((current) => current.filter((id) => id !== deleteTarget.id));
      if (preview?.id === deleteTarget.id) setPreview(null);
      setDeleteTarget(null);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const kpis = stats.data?.kpis.members;
  const emptyState = EMPTY_BY_STATUS[statusFilter] ?? EMPTY_BY_STATUS[""];
  const hasFilters = Boolean(q || gender || profession || skill || ageMin || ageMax || from || to || territory.province_id);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Membres" }, { label: view.label }]} />

      <DashboardAnimate>
        <MembersHero view={view} resultCount={data?.meta.total} />
      </DashboardAnimate>

      {kpis && (
        <DashboardAnimate delay={60}>
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
            <KpiCard label="Total" value={kpis.total} icon={Users} tone="info" href="/membres" />
            <KpiCard label="Actifs" value={kpis.active} icon={UserPlus} tone="success" href="/membres?status=active" />
            <KpiCard label="En attente" value={kpis.pending} icon={Users} tone="warning" href="/membres?status=pending" />
            <KpiCard label="Suspendus" value={kpis.suspended} icon={UserMinus} tone="danger" href="/membres?status=suspended" />
          </div>
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={100}>
        <DashboardSection
          icon={Filter}
          title="Recherche & filtres"
          description="Affinez la liste affichée ci-dessous"
          tone="brand"
          action={
            <div className="flex flex-wrap gap-2">
              <Can permission={PERMISSIONS.membersExport}>
                <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
                  <Download className="h-4 w-4" />
                  Exporter
                </Button>
              </Can>
              <Can permission={PERMISSIONS.membersCreate}>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </Can>
            </div>
          }
        >
          <Card className="overflow-hidden border-brand-100/80">
            <CardBody className="space-y-4 bg-gradient-to-b from-brand-50/30 to-transparent pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="relative min-w-[14rem] flex-1">
                  <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Nom, ID membre, téléphone…"
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    className="pl-9"
                  />
                </div>
                <Select
                  label="Statut"
                  placeholder="Tous"
                  value={statusFilter}
                  onChange={(e) => goToStatus(e.target.value)}
                  options={references?.member_statuses ?? []}
                  wrapperClassName="w-40"
                />
                <Button variant="ghost" size="sm" onClick={() => setAdvanced((v) => !v)}>
                  {advanced ? "Masquer filtres" : "Filtres avancés"}
                </Button>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réinitialiser
                  </Button>
                )}
              </div>

              {advanced && (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <TerritorySelect value={territory} onChange={(v) => { setTerritory(v); setPage(1); }} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Select label="Sexe" placeholder="Tous" value={gender} onChange={(e) => setGender(e.target.value)} options={references?.genders ?? []} />
                    <Input label="Profession" value={profession} onChange={(e) => setProfession(e.target.value)} />
                    <Input label="Compétence" value={skill} onChange={(e) => setSkill(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input label="Âge min" type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
                      <Input label="Âge max" type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
                    </div>
                    <Input label="Inscrit depuis" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    <Input label="Jusqu'au" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={160}>
        <Card>
          <CardHeader
            title={`Liste — ${view.label}`}
            description={loading ? "Chargement…" : `${formatNumber(data?.meta.total ?? 0)} membre(s) correspondant(s)`}
          />

          {error && (
            <Alert tone="error" title="Impossible de charger les membres" className="m-4">
              {error}
            </Alert>
          )}

          {loading && !data && <TableSkeleton columns={7} />}

          {!loading && data && data.data.length === 0 && (
            <EmptyState
              title={emptyState.title}
              description={emptyState.description}
              action={
                statusFilter === "pending" ? (
                  <Button variant="outline" onClick={() => goToStatus("")}>Voir tous les membres</Button>
                ) : (
                  <Can permission={PERMISSIONS.membersCreate}>
                    <Button onClick={() => setFormOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Ajouter un membre
                    </Button>
                  </Can>
                )
              }
            />
          )}

          {!loading && data && data.data.length > 0 && (
            <>
              <MembersTable
                members={data.data}
                selected={selected}
                sort={sort}
                direction={direction}
                busyId={deleteBusy ? deleteTarget?.id : null}
                onToggleAll={toggleAll}
                onToggleOne={(id, checked) => {
                  setSelected((current) =>
                    checked ? [...current, id] : current.filter((item) => item !== id),
                  );
                }}
                onSort={toggleSort}
                onPreview={setPreview}
                onEdit={(member) => {
                  setEditing(member);
                  setFormOpen(true);
                }}
                onDelete={setDeleteTarget}
              />

              {selected.length > 0 && (
                <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-brand-200 bg-brand-50 px-4 py-3">
                  <p className="text-sm font-medium text-brand-900">{selected.length} membre(s) sélectionné(s)</p>
                  <div className="flex gap-2">
                    <Can permission={PERMISSIONS.membersExport}>
                      <Button variant="outline" size="sm" onClick={() => void exportCsv()}>
                        <Download className="h-4 w-4" /> Exporter
                      </Button>
                    </Can>
                    <Can permission={PERMISSIONS.membersChangeStatus}>
                      <Button variant="outline" size="sm" loading={bulkBusy} onClick={() => void bulkArchive()}>
                        <Archive className="h-4 w-4" /> Archiver
                      </Button>
                    </Can>
                  </div>
                </div>
              )}

              <Pagination
                page={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                perPage={data.meta.per_page}
                onChange={setPage}
                label="membres"
              />
            </>
          )}
        </Card>
      </DashboardAnimate>

      <MemberFormDialog open={formOpen} member={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={reload} />
      <MemberPreviewDrawer
        member={preview}
        onClose={() => setPreview(null)}
        onEdit={preview ? (member) => { setPreview(null); setEditing(member); setFormOpen(true); } : undefined}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title="Supprimer ce membre ?"
        message={
          deleteTarget ? (
            <>
              Le dossier <strong>{deleteTarget.full_name}</strong> ({deleteTarget.member_code}) sera supprimé
              définitivement. Cette action est irréversible.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        tone="danger"
        loading={deleteBusy}
      />
    </div>
  );
}
