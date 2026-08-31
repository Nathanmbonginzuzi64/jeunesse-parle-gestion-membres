"use client";

import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { REPORT_CATALOG } from "@/lib/reports/catalog";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function ReportsHubPage() {
  const { can } = useAuth();

  const visible = REPORT_CATALOG.filter(
    (item) => !item.permission || can(item.permission),
  );

  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { label: "Rapports & Analyses" },
        ]}
      />
      <DashboardAnimate>
        <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-5 text-white shadow-[var(--shadow-elevated)] sm:px-6">
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
              <BarChart3 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
                Centre d&apos;analyse stratégique
              </p>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Rapports & Analyses
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-brand-100/90">
                Vision complète de la communauté Jeunesse Parle — membres, activités, cartes,
                présences, utilisateurs et traçabilité, avec exports institutionnels.
              </p>
            </div>
          </div>
        </div>
      </DashboardAnimate>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.id} href={item.href} className="group block">
              <Card className="h-full transition hover:border-brand-300 hover:shadow-md">
                <CardBody className="flex h-full flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    {item.badge ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold text-slate-900 group-hover:text-brand-700">
                      {item.label}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center text-sm font-medium text-brand-700",
                      "group-hover:underline",
                    )}
                  >
                    Consulter
                    <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                  </span>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </RequirePermission>
  );
}
