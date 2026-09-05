"use client";

import Link from "next/link";
import { BarChart3, ChevronRight } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { REPORT_CATALOG, REPORT_TONE_STYLES } from "@/lib/reports/catalog";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export default function ReportsHubPage() {
  const { can } = useAuth();

  const visible = REPORT_CATALOG.filter(
    (item) => !item.permission || can(item.permission),
  );

  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <div className="space-y-6 pb-10">
        <Breadcrumb
          items={[
            { href: "/tableau-de-bord", label: "Pilotage" },
            { label: "Rapports & Analyses" },
          ]}
        />

        <ReportPageHeader
          icon={BarChart3}
          eyebrow="Centre d'analyse stratégique"
          title="Rapports & Analyses"
          description="Vision complète de la communauté Jeunesse Parle — membres, activités, cartes, présences, utilisateurs et traçabilité, avec exports institutionnels."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => {
            const Icon = item.icon;
            const tone = REPORT_TONE_STYLES[item.tone ?? "brand"];
            return (
              <Link key={item.id} href={item.href} className="group block">
                <Card
                  className={cn(
                    "h-full rounded-2xl border-slate-200/80 shadow-sm transition duration-200",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    tone.soft,
                  )}
                >
                  <CardBody className="flex h-full flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl ring-1",
                          tone.icon,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      {item.exportHint ? (
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                          Export PDF
                        </span>
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold text-slate-900 transition group-hover:text-brand-800">
                        {item.label}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        {item.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center text-sm font-semibold text-brand-700">
                      Ouvrir
                      <ChevronRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}
