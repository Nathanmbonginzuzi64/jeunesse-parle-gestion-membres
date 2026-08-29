"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Ban,
  Clock,
  CreditCard,
  Eye,
  IdCard,
  Printer,
  RefreshCw,
  ScanLine,
  ShieldOff,
} from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission, Can } from "@/components/auth/require-permission";
import { Avatar } from "@/components/ui/avatar";
import { CardStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tooltip } from "@/components/ui/tooltip";
import { QuickLinkCard } from "@/components/dashboard/quick-link-card";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { MemberCard, Paginated, StatisticsOverview } from "@/lib/types";
import { formatShortDate, cn } from "@/lib/utils";

interface CardRow extends MemberCard {
  member_id: number;
  member_code: string;
  full_name: string;
  photo_url: string | null;
}

const TAB_ICONS: Record<string, typeof IdCard> = {
  "": IdCard,
  active: BadgeCheck,
  expired: Clock,
  suspended: ShieldOff,
  replaced: RefreshCw,
};

export default function CardsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsView}>
      <CardsList />
    </RequirePermission>
  );
}

function CardsList() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CardRow | null>(null);
  const stats = useApi<StatisticsOverview>("/statistics");
  const { data, loading, error, reload } = useApi<Paginated<CardRow>>("/cards", {
    status: status || undefined,
    page,
  });

  async function regenerate(card: CardRow) {
    setBusyId(card.id);
    try {
      const response = await api.post<{ message: string }>(`/cards/${card.id}/regenerate`);
      toast.success(response.message);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  async function revoke() {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    try {
      const response = await api.post<{ message: string }>(`/cards/${revokeTarget.id}/revoke`);
      toast.success(response.message);
      setRevokeTarget(null);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusyId(null);
    }
  }

  const kpis = stats.data?.kpis;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Pilotage" }, { label: "Cartes" }]} />
      <PageHeader
        title="Cartes membres"
        description="Gestion des cartes JP-RDC — émission, renouvellement, désactivation et impression."
      />

      <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
        <KpiCard
          label="Cartes actives"
          value={kpis?.cards.active ?? "—"}
          icon={BadgeCheck}
          tone="success"
        />
        <KpiCard
          label="Émises ce mois"
          value={kpis?.cards.issued_this_month ?? "—"}
          icon={CreditCard}
          tone="info"
        />
        <KpiCard
          label="Total (filtre)"
          value={data?.meta.total ?? "—"}
          icon={IdCard}
          hint={status ? "liste filtrée" : "toutes les cartes"}
        />
        <KpiCard
          label="Vérifications (30 j)"
          value={kpis?.verifications.last_30_days ?? "—"}
          icon={ScanLine}
          tone="neutral"
          href="/verification"
        />
      </div>

      <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-3")}>
        <QuickLinkCard
          href="/verification"
          icon={ScanLine}
          title="Vérifier un membre"
          description="Scan QR ou saisie manuelle"
          tone="emerald"
        />
        <QuickLinkCard
          href="/scan"
          icon={BadgeCheck}
          title="Scan de présence"
          description="Enregistrer une participation"
          tone="amber"
        />
        <QuickLinkCard
          href="/membres?status=active"
          icon={IdCard}
          title="Membres sans carte"
          description="Valider les dossiers en attente"
          tone="brand"
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <IdCard className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Registre des cartes</p>
            <p className="text-xs text-slate-500">Filtrer par statut et agir sur chaque carte</p>
          </div>
          <Tabs
            tabs={[
              { id: "", label: "Toutes" },
              { id: "active", label: "Actives" },
              { id: "expired", label: "Expirées" },
              { id: "suspended", label: "Suspendues" },
              { id: "replaced", label: "Remplacées" },
            ]}
            value={status}
            onChange={(id) => {
              setStatus(id);
              setPage(1);
            }}
            className="w-full lg:w-auto"
          />
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {loading && <TableSkeleton />}
        {!loading && data && data.data.length === 0 && (
          <EmptyState title="Aucune carte" description="Aucune carte ne correspond à ce filtre." />
        )}
        {!loading && data && data.data.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Membre</Th>
                  <Th>N° carte</Th>
                  <Th>Statut</Th>
                  <Th>Émise</Th>
                  <Th>Expire</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((card) => {
                  const TabIcon = TAB_ICONS[card.status] ?? IdCard;
                  return (
                    <Tr key={card.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar src={card.photo_url} name={card.full_name} size="sm" />
                          <span>
                            <span className="block font-medium">{card.full_name}</span>
                            <span className="font-mono text-[11px] text-slate-500">{card.member_code}</span>
                          </span>
                        </div>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700">
                          <TabIcon className="h-3.5 w-3.5 text-brand-500" aria-hidden />
                          {card.card_number}
                        </span>
                      </Td>
                      <Td>
                        <CardStatusBadge status={card.status} label={card.status_label} />
                      </Td>
                      <Td className="text-xs text-slate-600">{formatShortDate(card.issued_at)}</Td>
                      <Td className="text-xs text-slate-600">{formatShortDate(card.expires_at)}</Td>
                      <Td>
                        <div className="flex justify-end gap-0.5 rounded-lg border border-slate-100 bg-slate-50/80 p-1">
                          <Tooltip content="Aperçu de la carte">
                            <Link href={`/cartes/apercu/${card.member_id}`} aria-label="Aperçu">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-700 hover:bg-brand-50">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          <Tooltip content="Imprimer">
                            <Link href={`/cartes/apercu/${card.member_id}`} aria-label="Imprimer">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600 hover:bg-white">
                                <Printer className="h-4 w-4" />
                              </Button>
                            </Link>
                          </Tooltip>
                          <Can permission={PERMISSIONS.cardsIssue}>
                            <Tooltip content="Régénérer la carte">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-700 hover:bg-amber-50"
                                aria-label="Régénérer"
                                loading={busyId === card.id}
                                onClick={() => void regenerate(card)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </Can>
                          <Can permission={PERMISSIONS.cardsRevoke}>
                            {card.status === "active" && (
                              <Tooltip content="Désactiver">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  aria-label="Désactiver"
                                  onClick={() => setRevokeTarget(card)}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}
                          </Can>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination
              page={data.meta.current_page}
              lastPage={data.meta.last_page}
              total={data.meta.total}
              perPage={data.meta.per_page}
              onChange={setPage}
              label="cartes"
            />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => void revoke()}
        loading={busyId !== null}
        title="Désactiver cette carte ?"
        message="Le membre ne pourra plus l'utiliser pour se faire identifier."
        confirmLabel="Désactiver"
        tone="danger"
      />
    </div>
  );
}
