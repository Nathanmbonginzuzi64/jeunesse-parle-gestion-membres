"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  CreditCard,
  IdCard,
  RefreshCw,
  ShieldOff,
  type LucideIcon,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { useApi } from "@/lib/hooks";
import type { MemberCard, Paginated, StatisticsOverview } from "@/lib/types";

export interface CardRow extends MemberCard {
  member_id: number;
  member_code: string;
  full_name: string;
  photo_url: string | null;
  province?: { id: number; name: string } | null;
}

export const CARD_STATUS_VIEWS = [
  { id: "", label: "Toutes", href: "/cartes", icon: IdCard, description: "Registre complet des cartes JP-RDC" },
  { id: "active", label: "Actives", href: "/cartes?status=active", icon: BadgeCheck, description: "Cartes valides et utilisables" },
  { id: "expired", label: "Expirées", href: "/cartes?status=expired", icon: Clock, description: "Cartes arrivées à expiration" },
  { id: "suspended", label: "Suspendues", href: "/cartes?status=suspended", icon: ShieldOff, description: "Cartes temporairement bloquées" },
  { id: "replaced", label: "Remplacées", href: "/cartes?status=replaced", icon: RefreshCw, description: "Anciennes cartes remplacées" },
] as const;

export function getCardStatusView(status: string) {
  return CARD_STATUS_VIEWS.find((view) => view.id === status) ?? CARD_STATUS_VIEWS[0];
}

export function CardsStatusNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";
  const base = pathname.startsWith("/cartes/galerie") ? "/cartes/galerie" : "/cartes";
  const allCards = useApi<Paginated<CardRow>>("/cards", { per_page: 200 });
  const stats = useApi<StatisticsOverview>("/statistics");

  const items = allCards.data?.data ?? [];
  const counts = allCards.data
    ? {
        total: allCards.data.meta.total,
        active: items.filter((c) => c.status === "active").length,
        expired: items.filter((c) => c.status === "expired").length,
        suspended: items.filter((c) => c.status === "suspended").length,
        replaced: items.filter((c) => c.status === "replaced").length,
      }
    : undefined;

  return (
    <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
      {CARD_STATUS_VIEWS.map((view) => {
        const active = current === view.id;
        const Icon = view.icon;
        const count = view.id === "" ? counts?.total ?? stats.data?.kpis.cards.active : counts?.[view.id];

        return (
          <Link
            key={view.id || "all"}
            href={view.id ? `${base}?status=${view.id}` : base}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{view.label}</span>
            {count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {formatNumber(count)}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function CardsHero({
  view,
  resultCount,
}: {
  view: (typeof CARD_STATUS_VIEWS)[number];
  resultCount?: number;
}) {
  const Icon = view.icon;

  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <CreditCard className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Identité & QR code
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{view.label}</h1>
            <p className="mt-1 text-sm text-brand-100/90">{view.description}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {resultCount !== undefined ? `${formatNumber(resultCount)} carte(s)` : "JP-RDC"}
        </span>
      </div>
    </div>
  );
}

export function cardStatusIcon(status: string): LucideIcon {
  const view = CARD_STATUS_VIEWS.find((v) => v.id === status);
  return view?.icon ?? IdCard;
}
