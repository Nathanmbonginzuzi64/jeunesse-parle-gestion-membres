"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  Download,
  Eye,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { MemberPreviewDrawer } from "@/components/members/member-preview-drawer";
import {
  getMemberStatusView,
  MembersHero,
} from "@/components/members/members-status-nav";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { RequirePermission, Can } from "@/components/auth/require-permission";
import { Avatar } from "@/components/ui/avatar";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox, Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { TerritorySelect } from "@/components/forms/territory-select";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, downloadFile, ApiError } from "@/lib/api";
import { useApi, useDebounced, useReferences } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { Member, Paginated, StatisticsOverview } from "@/lib/types";
import { cn, formatNumber, formatShortDate } from "@/lib/utils";
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
    commune_id: null as number | null,
    zone_id: null as number | null,
  });
  const [advanced, setAdvanced] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [preview, setPreview] = useState<Member | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

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
    setTerritory({ province_id: null, city_id: null, commune_id: null, zone_id: null });
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
              <div className="divide-y divide-slate-100 md:hidden">
                {data.data.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setPreview(member)}
                    className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-brand-50/40"
                  >
                    <Avatar src={member.photo_url} name={member.full_name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{member.full_name}</span>
                      <span className="block font-mono text-[11px] text-slate-500">{member.member_code}</span>
                    </span>
                    <MemberStatusBadge status={member.status} label={member.status_label} />
                  </button>
                ))}
              </div>

              <div className="hidden md:block">
                <Table className="min-w-[72rem]">
                  <thead>
                    <tr>
                      <Th className="w-10">
                        <Checkbox
                          label="Tout sélectionner"
                          className="sr-only [&_label]:sr-only"
                          checked={Boolean(data.data.length && selected.length === data.data.length)}
                          onChange={(e) => toggleAll(e.target.checked)}
                        />
                      </Th>
                      <Th>Photo</Th>
                      <Th sortable active={sort === "member_code"} direction={direction} onSort={() => toggleSort("member_code")}>ID</Th>
                      <Th>Nom</Th>
                      <Th>Téléphone</Th>
                      <Th>Province</Th>
                      <Th>Structure</Th>
                      <Th sortable active={sort === "status"} direction={direction} onSort={() => toggleSort("status")}>Statut</Th>
                      <Th sortable active={sort === "created_at"} direction={direction} onSort={() => toggleSort("created_at")}>Inscription</Th>
                      <Th className="w-28">Actions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((member) => (
                      <Tr key={member.id} className="cursor-pointer hover:bg-brand-50/30" onClick={() => setPreview(member)}>
                        <Td onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            label={member.full_name}
                            className="[&_label]:sr-only"
                            checked={selected.includes(member.id)}
                            onChange={(e) => {
                              setSelected((c) => e.target.checked ? [...c, member.id] : c.filter((id) => id !== member.id));
                            }}
                          />
                        </Td>
                        <Td><Avatar src={member.photo_url} name={member.full_name} size="sm" /></Td>
                        <Td className="font-mono text-xs">{member.member_code}</Td>
                        <Td className="font-medium">{member.full_name}</Td>
                        <Td className="text-xs">{member.phone ?? "—"}</Td>
                        <Td className="text-xs">{member.province?.name ?? "—"}</Td>
                        <Td className="text-xs">{member.structure?.name ?? "—"}</Td>
                        <Td><MemberStatusBadge status={member.status} label={member.status_label} /></Td>
                        <Td className="text-xs text-slate-500">{formatShortDate(member.created_at)}</Td>
                        <Td onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Link href={`/membres/${member.id}`} aria-label="Voir">
                              <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            </Link>
                            <Can permission={PERMISSIONS.membersUpdate}>
                              <Button variant="ghost" size="icon" aria-label="Modifier" onClick={() => { setEditing(member); setFormOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Can>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>

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
    </div>
  );
}
