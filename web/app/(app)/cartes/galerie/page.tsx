"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Search } from "lucide-react";
import { CardsVisualGrid } from "@/components/cards/cards-visual-grid";
import { getCardStatusView } from "@/components/cards/cards-status-nav";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi, useDebounced, useReferences } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { CardVisualItem, Paginated } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export default function CardsGalleryPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsView}>
      <Suspense fallback={<TableSkeleton />}>
        <CardsGallery />
      </Suspense>
    </RequirePermission>
  );
}

function CardsGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const references = useReferences();
  const statusFilter = searchParams.get("status") ?? "";
  const view = getCardStatusView(statusFilter);

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const debouncedQ = useDebounced(q);
  const query = useMemo(
    () => ({
      page,
      q: debouncedQ || undefined,
      status: statusFilter || undefined,
      per_page: 12,
    }),
    [page, debouncedQ, statusFilter],
  );

  const { data, loading, error } = useApi<Paginated<CardVisualItem>>("/cards/visual", query);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/cartes", label: "Cartes" },
          { label: "Galerie visuelle" },
        ]}
      />

      <DashboardAnimate>
        <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6">
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
                  Aperçu graphique
                </p>
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Galerie des cartes</h1>
                <p className="mt-1 text-sm text-brand-100/90">
                  Visualisation des cartes JP-RDC — {view.label.toLowerCase()}
                </p>
              </div>
            </div>
            {data && (
              <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15">
                {formatNumber(data.meta.total)} carte(s)
              </span>
            )}
          </div>
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <Card>
          <CardHeader title="Filtres" description="Recherche et statut pour la galerie" />
          <CardBody className="flex flex-wrap items-end gap-3">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Nom, ID membre, n° carte…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <Select
              label="Statut"
              placeholder="Tous"
              value={statusFilter}
              onChange={(e) => {
                const value = e.target.value;
                router.push(value ? `/cartes/galerie?status=${value}` : "/cartes/galerie");
              }}
              options={references?.card_statuses ?? []}
              wrapperClassName="w-44"
            />
            <Link href="/cartes" className="text-sm font-medium text-brand-700 hover:underline">
              ← Registre tableau
            </Link>
          </CardBody>
        </Card>
      </DashboardAnimate>

      <DashboardAnimate delay={120}>
        <Card>
          {error && <Alert tone="error" className="m-4">{error}</Alert>}
          {loading && !data && <TableSkeleton />}
          {!loading && data && data.data.length === 0 && (
            <EmptyState
              title="Aucune carte à afficher"
              description="Aucune carte ne correspond à ce filtre."
              action={
                <Link href="/cartes/galerie" className="text-sm font-medium text-brand-700 hover:underline">
                  Réinitialiser les filtres
                </Link>
              }
            />
          )}
          {!loading && data && data.data.length > 0 && (
            <>
              <CardBody>
                <CardsVisualGrid items={data.data} />
              </CardBody>
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
    </div>
  );
}
