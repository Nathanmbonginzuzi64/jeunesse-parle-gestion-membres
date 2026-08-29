"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  CreditCard,
  IdCard,
  QrCode,
  ScanLine,
} from "lucide-react";
import {
  CardsHero,
  getCardStatusView,
  type CardRow,
} from "@/components/cards/cards-status-nav";
import { CardsTable } from "@/components/cards/cards-table";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { QuickLinkCard } from "@/components/dashboard/quick-link-card";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card, CardHeader } from "@/components/ui/card";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Paginated, StatisticsOverview } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const EMPTY_BY_STATUS: Record<string, { title: string; description: string }> = {
  "": { title: "Aucune carte", description: "Aucune carte n'a encore été émise." },
  active: { title: "Aucune carte active", description: "Aucune carte valide ne correspond à ce filtre." },
  expired: { title: "Aucune carte expirée", description: "Toutes les cartes sont à jour." },
  suspended: { title: "Aucune carte suspendue", description: "Aucune suspension en cours." },
  replaced: { title: "Aucune carte remplacée", description: "Historique des remplacements vide." },
};

export default function CardsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsView}>
      <Suspense fallback={<TableSkeleton />}>
        <CardsList />
      </Suspense>
    </RequirePermission>
  );
}

function CardsList() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") ?? "";
  const view = getCardStatusView(statusFilter);

  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<CardRow | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const stats = useApi<StatisticsOverview>("/statistics");
  const { data, loading, error, reload } = useApi<Paginated<CardRow>>("/cards", {
    status: statusFilter || undefined,
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
  const emptyState = EMPTY_BY_STATUS[statusFilter] ?? EMPTY_BY_STATUS[""];

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { label: "Cartes" },
          { label: view.label },
        ]}
      />

      <DashboardAnimate>
        <CardsHero view={view} resultCount={data?.meta.total} />
      </DashboardAnimate>

      {kpis && (
        <DashboardAnimate delay={60}>
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
            <KpiCard label="Cartes actives" value={kpis.cards.active} icon={BadgeCheck} tone="success" href="/cartes?status=active" />
            <KpiCard label="Émises ce mois" value={kpis.cards.issued_this_month} icon={CreditCard} tone="info" href="/cartes" hint="période courante" />
            <KpiCard label="Résultats (filtre)" value={data?.meta.total ?? "—"} icon={IdCard} tone="neutral" hint={statusFilter ? "liste filtrée" : "toutes les cartes"} />
            <KpiCard label="Vérifications (30 j)" value={kpis.verifications.last_30_days} icon={ScanLine} tone="info" href="/verification" />
          </div>
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={100}>
        <DashboardSection icon={QrCode} title="Raccourcis" description="Vérification, présence et émission" tone="emerald">
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-3")}>
            <QuickLinkCard href="/verification" icon={ScanLine} title="Vérifier un membre" description="Scan QR ou saisie manuelle" tone="emerald" />
            <QuickLinkCard href="/scan" icon={BadgeCheck} title="Scan de présence" description="Enregistrer une participation" tone="amber" />
            <QuickLinkCard href="/membres?status=pending" icon={IdCard} title="Dossiers en attente" description="Valider et émettre les cartes" tone="brand" />
          </div>
        </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={160}>
        <Card>
          <CardHeader
            title={`Registre — ${view.label}`}
            description={
              loading
                ? "Chargement…"
                : `${formatNumber(data?.meta.total ?? 0)} carte(s) · émission, renouvellement et désactivation`
            }
          />

          {error && <Alert tone="error" className="m-4">{error}</Alert>}
          {loading && !data && <TableSkeleton />}
          {!loading && data && data.data.length === 0 && (
            <EmptyState
              title={emptyState.title}
              description={emptyState.description}
              action={
                statusFilter ? (
                  <Link href="/cartes" className="text-sm font-medium text-brand-700 hover:underline">
                    Voir toutes les cartes
                  </Link>
                ) : undefined
              }
            />
          )}
          {!loading && data && data.data.length > 0 && (
            <>
              <CardsTable
                cards={data.data}
                busyId={busyId}
                onRegenerate={(card) => void regenerate(card)}
                onRevoke={setRevokeTarget}
              />
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
      </DashboardAnimate>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onClose={() => !busyId && setRevokeTarget(null)}
        onConfirm={() => void revoke()}
        loading={busyId !== null}
        title="Désactiver cette carte ?"
        message={
          revokeTarget ? (
            <>
              La carte <strong>{revokeTarget.card_number}</strong> de {revokeTarget.full_name} sera désactivée.
              Le membre ne pourra plus l&apos;utiliser pour s&apos;identifier.
            </>
          ) : null
        }
        confirmLabel="Désactiver"
        tone="danger"
      />
    </div>
  );
}
