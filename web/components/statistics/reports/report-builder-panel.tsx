"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileDown,
  Loader2,
  Printer,
  RotateCcw,
} from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { TerritorySelect } from "@/components/forms/territory-select";
import { ReportDocument } from "@/components/statistics/reports/report-document";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { useApi, usePublicStructures } from "@/lib/hooks";
import { buildReportFilename, exportReportToPdf } from "@/lib/reports/export-pdf";
import {
  REPORT_TYPES,
  type ReportFilters,
  type ReportPayload,
  type ReportType,
} from "@/lib/reports/types";
import type { StatisticsCharts, StatisticsOverview } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReportBuilderPanel() {
  const { user } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [reportType, setReportType] = useState<ReportType>("synthese");
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30d");
  const [status, setStatus] = useState("");
  const [structureId, setStructureId] = useState<number | "">("");
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });

  const structures = usePublicStructures(territory.province_id, territory.city_id);
  const filters: ReportFilters = useMemo(
    () => ({
      period,
      status,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      structure_id: structureId,
    }),
    [period, status, territory, structureId],
  );

  const apiFilters = useMemo(
    () => ({
      period,
      status: status || undefined,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      structure_id: structureId || undefined,
    }),
    [period, status, territory, structureId],
  );

  const overview = useApi<StatisticsOverview>("/statistics", apiFilters);
  const charts = useApi<StatisticsCharts>("/statistics/charts", apiFilters);

  const payload: ReportPayload | null =
    overview.data && charts.data
      ? {
          type: reportType,
          filters,
          overview: overview.data,
          charts: charts.data,
          generatedAt: new Date().toISOString(),
          generatedBy: user?.name ?? undefined,
        }
      : null;

  const selectedMeta = REPORT_TYPES.find((item) => item.id === reportType);
  const loading = overview.loading || charts.loading;
  const ready = Boolean(payload) && !loading;

  function resetFilters() {
    setPeriod("30d");
    setStatus("");
    setStructureId("");
    setTerritory({ province_id: null, city_id: null, district_id: null, commune_id: null, zone_id: null });
  }

  async function handleExport() {
    if (!printRef.current || !payload) return;
    setExporting(true);
    setError(null);
    try {
      await exportReportToPdf(printRef.current, buildReportFilename(reportType));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export PDF impossible.");
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Rapport Jeunesse Parle</title><style>
      body{margin:0;background:#fff;font-family:system-ui,sans-serif}
      @page{size:A4;margin:0}
    </style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="space-y-6">
      <DashboardAnimate>
        <Card className="overflow-hidden border-brand-100">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FileDown className="h-4 w-4 text-brand-600" />
                Générateur de rapports
              </span>
            }
            description="Sélectionnez un modèle, configurez les filtres et exportez un PDF institutionnel"
          />
          <CardBody className="space-y-5 bg-gradient-to-b from-brand-50/30 to-transparent">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {REPORT_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setReportType(item.id); setShowPreview(false); }}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    reportType === item.id
                      ? "border-brand-500 bg-brand-50 shadow-[var(--shadow-card)] ring-2 ring-brand-200"
                      : "border-slate-200 bg-white hover:border-brand-200 hover:bg-brand-50/40",
                  )}
                >
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
              <Select label="Période" value={period} onChange={(e) => setPeriod(e.target.value)} options={[
                { value: "7d", label: "7 jours" }, { value: "30d", label: "30 jours" },
                { value: "90d", label: "90 jours" }, { value: "12m", label: "12 mois" },
              ]} wrapperClassName="min-w-[9rem]" />
              <Select label="Statut" placeholder="Tous" value={status} onChange={(e) => setStatus(e.target.value)} options={[
                { value: "active", label: "Actifs" }, { value: "pending", label: "En attente" },
                { value: "suspended", label: "Suspendus" }, { value: "inactive", label: "Inactifs" },
              ]} wrapperClassName="min-w-[9rem]" />
              <div className="min-w-[14rem] flex-1">
                <TerritorySelect value={territory} onChange={(v) => { setTerritory(v); setStructureId(""); }} />
              </div>
              <Select label="Structure" placeholder="Toutes" value={structureId} onChange={(e) => setStructureId(e.target.value ? Number(e.target.value) : "")} options={structures.map((s) => ({ value: s.id, label: s.name }))} wrapperClassName="min-w-[10rem]" />
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button type="button" disabled={!ready} onClick={() => setShowPreview(true)}>
                <Eye className="h-4 w-4" /> Aperçu
              </Button>
              <Button type="button" variant="outline" disabled={!ready || exporting} onClick={handleExport}>
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger PDF
              </Button>
              <Button type="button" variant="outline" disabled={!ready} onClick={handlePrint}>
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            {loading && <p className="text-sm text-slate-500">Chargement des données du rapport…</p>}
            {!loading && overview.error && <Alert tone="error">{overview.error}</Alert>}
          </CardBody>
        </Card>
      </DashboardAnimate>

      {showPreview && payload && (
        <DashboardAnimate delay={80}>
          <Card>
            <CardHeader title={`Aperçu — ${selectedMeta?.label}`} description="Format A4 · Logo Jeunesse Parle inclus" />
            <CardBody className="overflow-x-auto bg-slate-100 p-6">
              <div ref={printRef} className="mx-auto flex flex-col gap-8">
                <ReportDocument payload={payload} />
              </div>
            </CardBody>
          </Card>
        </DashboardAnimate>
      )}

      {ready && !showPreview && (
        <div
          ref={printRef}
          className="pointer-events-none absolute top-0 left-0 -z-10 opacity-[0.01]"
          style={{ width: 794 }}
          aria-hidden
        >
          <ReportDocument payload={payload!} />
        </div>
      )}
    </div>
  );
}
