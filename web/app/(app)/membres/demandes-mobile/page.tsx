"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";
import { RequirePermission, Can } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { Avatar } from "@/components/ui/avatar";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Pagination } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { Member, MemberStatus, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

type GroupBy = "day" | "month" | "year";

interface MobileStats {
  kpis: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    today: number;
    this_month: number;
    this_year: number;
  };
  group_by: GroupBy;
  report: Array<{
    period: string;
    label: string;
    total: number;
    pending: number;
    active: number;
  }>;
}

const STATUS_OPTIONS: Array<{ value: "" | MemberStatus; label: string }> = [
  { value: "", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
  { value: "inactive", label: "Inactifs" },
];

export default function MobileRequestsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.membersValidate}>
      <MobileRequestsContent />
    </RequirePermission>
  );
}

function MobileRequestsContent() {
  const toast = useToast();
  const now = new Date();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | MemberStatus>("pending");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmSelected, setConfirmSelected] = useState(false);

  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [reportYear, setReportYear] = useState(String(now.getFullYear()));
  const [reportMonth, setReportMonth] = useState(String(now.getMonth() + 1));
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  const debouncedQ = useDebounced(q, 350);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [status, from, to, debouncedQ]);

  const listQuery = useMemo(
    () => ({
      registration_channel: "mobile",
      status: status || undefined,
      q: debouncedQ || undefined,
      registered_from: from || undefined,
      registered_to: to || undefined,
      page,
      per_page: 20,
      sort: "created_at",
      direction: "desc" as const,
    }),
    [status, debouncedQ, from, to, page],
  );

  const statsQuery = useMemo(() => {
    const query: Record<string, string | number> = { group_by: groupBy };
    if (reportFrom) query.from = reportFrom;
    if (reportTo) query.to = reportTo;
    if (groupBy !== "year" && reportYear) query.year = Number(reportYear);
    if (groupBy === "day" && reportMonth) query.month = Number(reportMonth);
    return query;
  }, [groupBy, reportYear, reportMonth, reportFrom, reportTo]);

  const { data, loading, error, reload } = useApi<Paginated<Member>>("/members", listQuery);
  const stats = useApi<MobileStats>("/members/mobile-stats", statsQuery);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const kpis = stats.data?.kpis;
  const report = stats.data?.report ?? [];

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAll() {
    if (selected.length === 0 || selected.length !== rows.length) {
      setSelected(rows.map((row) => row.id));
      return;
    }
    setSelected([]);
  }

  async function approve(payload: { member_ids?: number[]; all_pending_mobile?: boolean }) {
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>("/members/bulk-validate", payload);
      toast.success(response.message);
      setSelected([]);
      setConfirmAll(false);
      setConfirmSelected(false);
      reload();
      stats.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => String(now.getFullYear() - i));
  const monthOptions = [
    { value: "1", label: "Janvier" },
    { value: "2", label: "Février" },
    { value: "3", label: "Mars" },
    { value: "4", label: "Avril" },
    { value: "5", label: "Mai" },
    { value: "6", label: "Juin" },
    { value: "7", label: "Juillet" },
    { value: "8", label: "Août" },
    { value: "9", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/membres", label: "Membres" },
          { label: "Demandes mobile" },
        ]}
      />

      <DashboardAnimate>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7")}>
          <KpiCard label="Total mobile" value={kpis?.total ?? "—"} icon={Smartphone} tone="info" />
          <KpiCard label="En attente" value={kpis?.pending ?? "—"} icon={Clock} tone="warning" />
          <KpiCard label="Approuvés" value={kpis?.active ?? "—"} icon={CheckCircle2} tone="success" />
          <KpiCard label="Suspendus" value={kpis?.suspended ?? "—"} icon={Users} tone="danger" />
          <KpiCard label="Aujourd’hui" value={kpis?.today ?? "—"} icon={CalendarDays} tone="info" />
          <KpiCard label="Ce mois" value={kpis?.this_month ?? "—"} icon={UserPlus} tone="neutral" />
          <KpiCard label="Cette année" value={kpis?.this_year ?? "—"} icon={Users} tone="neutral" />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <DashboardSection
          icon={CalendarDays}
          title="Rapport d’inscriptions mobiles"
          description="Consultez le volume d’inscriptions par jour, mois ou année."
          tone="brand"
        >
          <Card>
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label="Périodicité">
                  <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
                    <option value="day">Par jour</option>
                    <option value="month">Par mois</option>
                    <option value="year">Par année</option>
                  </Select>
                </Field>
                {groupBy !== "year" ? (
                  <Field label="Année">
                    <Select value={reportYear} onChange={(e) => setReportYear(e.target.value)}>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                {groupBy === "day" ? (
                  <Field label="Mois">
                    <Select value={reportMonth} onChange={(e) => setReportMonth(e.target.value)}>
                      {monthOptions.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}
                <Field label="Du (optionnel)">
                  <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
                </Field>
                <Field label="Au (optionnel)">
                  <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
                </Field>
              </div>

              {stats.error ? (
                <Alert tone="danger" title="Rapport indisponible">
                  {stats.error}
                </Alert>
              ) : null}

              {stats.loading && !stats.data ? (
                <TableSkeleton rows={4} />
              ) : report.length === 0 ? (
                <EmptyState
                  title="Aucune inscription sur cette période"
                  description="Modifiez le jour, le mois ou l’année pour afficher le rapport."
                />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Période</th>
                        <th className="px-4 py-3 text-right">Inscriptions</th>
                        <th className="px-4 py-3 text-right">En attente</th>
                        <th className="px-4 py-3 text-right">Approuvés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.map((row) => (
                        <tr key={row.period} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                          <td className="px-4 py-3 text-right font-semibold text-brand-700">
                            {formatNumber(row.total)}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-700">{formatNumber(row.pending)}</td>
                          <td className="px-4 py-3 text-right text-emerald-700">{formatNumber(row.active)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <DashboardSection
          icon={Smartphone}
          title="Inscriptions application mobile"
          description="Recherchez, filtrez et approuvez les dossiers. Après validation, le membre choisit sa structure dans l’app."
          tone="amber"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  reload();
                  stats.reload();
                }}
                disabled={busy}
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
              <Can permission={PERMISSIONS.membersValidate}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || selected.length === 0}
                  onClick={() => setConfirmSelected(true)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approuver la sélection ({selected.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || (kpis?.pending ?? 0) === 0}
                  onClick={() => setConfirmAll(true)}
                >
                  <CheckCheck className="h-4 w-4" />
                  Tout approuver
                </Button>
              </Can>
            </div>
          }
        >
          <Card className="mb-4 overflow-hidden border-amber-100/80">
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Recherche">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Nom, code, téléphone…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>
                </Field>
                <Field label="Statut">
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "" | MemberStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Inscrits du">
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="Au">
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
            </CardBody>
          </Card>

          {error ? <Alert tone="danger" title="Chargement impossible">{error}</Alert> : null}

          <Card className="overflow-hidden border-amber-100/80">
            <CardHeader
              title={status === "pending" ? "En attente d’approbation" : "Dossiers mobile"}
              description={`${meta?.total ?? rows.length} résultat(s)`}
            />
            <CardBody className="p-0">
              {loading && !data ? (
                <div className="p-6">
                  <TableSkeleton rows={6} />
                </div>
              ) : rows.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    title="Aucun dossier"
                    description="Aucun membre mobile ne correspond à ces filtres."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.length > 0 && selected.length === rows.length}
                            onChange={toggleAll}
                            aria-label="Tout sélectionner"
                          />
                        </th>
                        <th className="px-4 py-3">Membre</th>
                        <th className="px-4 py-3">Code</th>
                        <th className="px-4 py-3">Province</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">Reçu le</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((member) => (
                        <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(member.id)}
                              onChange={() => toggle(member.id)}
                              aria-label={`Sélectionner ${member.full_name}`}
                              disabled={member.status !== "pending"}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar src={member.photo_url} name={member.full_name} size="sm" />
                              <div>
                                <p className="font-semibold text-slate-900">{member.full_name}</p>
                                <p className="text-xs text-slate-500">App mobile</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {member.member_code}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{member.province?.name ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{member.phone ?? "—"}</div>
                            {member.email ? (
                              <div className="text-xs text-slate-400">{member.email}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {member.created_at ? formatDateTime(member.created_at) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <MemberStatusBadge status={member.status} label={member.status_label} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/membres/${member.id}`}
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                              >
                                Ouvrir
                              </Link>
                              {member.status === "pending" ? (
                                <Can permission={PERMISSIONS.membersValidate}>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void approve({ member_ids: [member.id] })}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    Approuver
                                  </button>
                                </Can>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {meta ? (
                <Pagination
                  page={meta.current_page}
                  lastPage={meta.last_page}
                  total={meta.total}
                  perPage={meta.per_page}
                  onChange={setPage}
                />
              ) : null}
            </CardBody>
          </Card>
        </DashboardSection>
      </DashboardAnimate>

      <ConfirmDialog
        open={confirmSelected}
        onClose={() => setConfirmSelected(false)}
        title="Approuver la sélection"
        message={`${selected.length} dossier(s) seront validés. Chaque membre pourra ensuite choisir sa structure dans l’application mobile.`}
        confirmLabel="Approuver"
        loading={busy}
        onConfirm={() => void approve({ member_ids: selected })}
      />

      <ConfirmDialog
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        title="Tout approuver"
        message="Toutes les demandes d’adhésion mobile encore en attente (dans votre périmètre) seront validées."
        confirmLabel="Tout approuver"
        loading={busy}
        onConfirm={() => void approve({ all_pending_mobile: true })}
      />
    </div>
  );
}
