"use client";

import { FileDown } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { ReportBuilderPanel } from "@/components/statistics/reports/report-builder-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PERMISSIONS } from "@/lib/permissions";

export default function ReportsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/statistiques", label: "Statistiques" },
          { label: "Rapports" },
        ]}
      />
      <DashboardAnimate>
        <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6">
          <div className="relative flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
              <FileDown className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">Export institutionnel</p>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Rapports</h1>
              <p className="mt-1 text-sm text-brand-100/90">
                Générez des rapports PDF officiels avec le logo Jeunesse Parle — synthèse, membres, territoire et mobilisation.
              </p>
            </div>
          </div>
        </div>
      </DashboardAnimate>
      <ReportBuilderPanel />
    </RequirePermission>
  );
}
