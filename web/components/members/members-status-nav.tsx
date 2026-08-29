"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  ShieldAlert,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { useApi } from "@/lib/hooks";
import type { StatisticsOverview } from "@/lib/types";

export const MEMBER_STATUS_VIEWS = [
  {
    id: "",
    label: "Tous les membres",
    href: "/membres",
    description: "Registre complet dans votre périmètre territorial",
    icon: Users,
    tone: "brand" as const,
  },
  {
    id: "active",
    label: "Membres actifs",
    href: "/membres?status=active",
    description: "Dossiers validés avec carte et accès plein",
    icon: UserCheck,
    tone: "emerald" as const,
  },
  {
    id: "pending",
    label: "En attente",
    href: "/membres?status=pending",
    description: "Inscriptions à valider ou compléter",
    icon: Clock,
    tone: "amber" as const,
  },
  {
    id: "suspended",
    label: "Suspendus",
    href: "/membres?status=suspended",
    description: "Comptes suspendus — action requise",
    icon: ShieldAlert,
    tone: "rose" as const,
  },
] as const;

export type MemberStatusViewId = (typeof MEMBER_STATUS_VIEWS)[number]["id"];

const TONE_STYLES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  rose: "bg-red-50 text-red-700 ring-red-100",
};

export function getMemberStatusView(status: string) {
  return MEMBER_STATUS_VIEWS.find((view) => view.id === status) ?? MEMBER_STATUS_VIEWS[0];
}

export function MembersStatusNav() {
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "";
  const stats = useApi<StatisticsOverview>("/statistics");

  const counts = stats.data
    ? {
        total: stats.data.kpis.members.total,
        active: stats.data.kpis.members.active,
        pending: stats.data.kpis.members.pending,
        suspended: stats.data.kpis.members.suspended,
      }
    : undefined;

  return (
    <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
      {MEMBER_STATUS_VIEWS.map((view) => {
        const active = current === view.id;
        const Icon = view.icon;
        const count =
          view.id === ""
            ? counts?.total
            : counts?.[view.id];

        return (
          <Link
            key={view.id || "all"}
            href={view.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4",
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-700",
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

export function MembersHero({
  view,
  resultCount,
}: {
  view: (typeof MEMBER_STATUS_VIEWS)[number];
  resultCount?: number;
}) {
  const Icon = view.icon;

  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Registre des membres
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{view.label}</h1>
            <p className="mt-1 text-sm text-brand-100/90">{view.description}</p>
          </div>
        </div>
        {resultCount !== undefined && (
          <span className="rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15">
            {formatNumber(resultCount)} résultat{resultCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export function memberStatusIcon(status: string): LucideIcon {
  const view = MEMBER_STATUS_VIEWS.find((v) => v.id === status);
  return view?.icon ?? Users;
}

export { TONE_STYLES };
