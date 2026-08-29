"use client";

/* eslint-disable @next/next/no-img-element */

import {
  PERIOD_LABELS,
  REPORT_TYPES,
  STATUS_LABELS,
  type ReportPayload,
  type ReportType,
} from "@/lib/reports/types";
import { formatDateLong } from "@/lib/datetime";
import { formatNumber } from "@/lib/utils";

const REPORT_TITLES: Record<ReportType, string> = {
  synthese: "Rapport de synthèse",
  membres: "Rapport — Profil des membres",
  territoire: "Rapport — Couverture territoriale",
  mobilisation: "Rapport — Mobilisation & activités",
};

function scopeLabel(scope: ReportPayload["overview"]["scope"]) {
  if (!scope.province) return "RDC — Échelle nationale";
  return [scope.province, scope.city, scope.structure].filter(Boolean).join(" · ");
}

function ReportPage({
  payload,
  page,
  total,
  pageLabel,
  children,
}: {
  payload: ReportPayload;
  page: number;
  total: number;
  pageLabel?: string;
  children: React.ReactNode;
}) {
  const meta = REPORT_TYPES.find((item) => item.id === payload.type);
  const { filters } = payload;

  return (
    <div data-report-page className="mx-auto flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-8" style={{ width: 794, minHeight: 1123 }}>
      <header className="border-b-2 border-brand-500 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpeg" alt="La Jeunesse Parle" width={56} height={56} className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-200" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">La Jeunesse Parle</p>
              <h1 className="text-lg font-bold text-slate-900">{REPORT_TITLES[payload.type]}</h1>
              <p className="text-xs text-slate-500">{meta?.description}</p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">Document officiel</p>
            <p>Généré le {formatDateLong(new Date(payload.generatedAt))}</p>
            {payload.generatedBy && <p>Par : {payload.generatedBy}</p>}
            {pageLabel && <p className="mt-1 font-medium text-brand-700">{pageLabel}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-md bg-brand-50 px-2 py-1 text-brand-800 ring-1 ring-brand-100">Période : {PERIOD_LABELS[filters.period] ?? filters.period}</span>
          <span className="rounded-md bg-brand-50 px-2 py-1 text-brand-800 ring-1 ring-brand-100">{filters.status ? `Statut : ${STATUS_LABELS[filters.status] ?? filters.status}` : "Statut : Tous"}</span>
          <span className="rounded-md bg-brand-50 px-2 py-1 text-brand-800 ring-1 ring-brand-100">{scopeLabel(payload.overview.scope)}</span>
        </div>
      </header>
      <div className="flex-1 py-6">{children}</div>
      <footer className="mt-auto flex justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">La Jeunesse Parle — RDC</p>
          <p>Document confidentiel · Usage institutionnel</p>
        </div>
        <p>Page {page} / {total}</p>
      </footer>
    </div>
  );
}

function Table({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-brand-700">{title}</h3>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-brand-600 text-white">
            {headers.map((h) => <th key={h} className="border border-brand-700 px-3 py-2 text-left">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
              {row.map((cell, j) => <td key={j} className="border border-slate-200 px-3 py-2">{typeof cell === "number" ? formatNumber(cell) : cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyntheseReport({ payload }: { payload: ReportPayload }) {
  const { overview, charts } = payload;
  const k = overview.kpis;
  const rate = k.members.total > 0 ? Math.round((k.members.active / k.members.total) * 100) : 0;
  const kpis = [
    ["Membres total", k.members.total], ["Actifs", k.members.active], ["En attente", k.members.pending], ["Nouveaux (30 j)", k.members.new_last_30_days],
    ["Cartes actives", k.cards.active], ["Vérifications", k.verifications.last_30_days], ["Provinces", k.coverage.provinces], ["Structures", k.coverage.structures],
  ] as const;

  return (
    <>
      <ReportPage payload={payload} page={1} total={2} pageLabel="Synthèse exécutive">
        <section className="space-y-5">
          <div className="rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
            Au {formatDateLong(new Date(payload.generatedAt))}, Jeunesse Parle recense <strong>{formatNumber(k.members.total)}</strong> membres dont <strong>{formatNumber(k.members.active)}</strong> actifs ({rate} %). Couverture : {formatNumber(k.coverage.provinces)} provinces, {formatNumber(k.coverage.structures)} structures.
          </div>
          <div className="grid grid-cols-4 gap-2">
            {kpis.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[9px] uppercase text-slate-500">{label}</p>
                <p className="text-lg font-bold tabular-nums">{formatNumber(value)}</p>
              </div>
            ))}
          </div>
          <Table title="Répartition par statut" headers={["Statut", "Effectif", "Part"]} rows={(charts.by_status ?? []).map((r) => [r.label, r.total, k.members.total ? `${Math.round((r.total / k.members.total) * 100)} %` : "—"])} />
        </section>
      </ReportPage>
      <ReportPage payload={payload} page={2} total={2} pageLabel="Tendances & territoire">
        <section className="space-y-5">
          <Table title="Inscriptions récentes" headers={["Période", "Total"]} rows={(charts.registrations_trend ?? []).slice(-8).map((r) => [r.label, r.total])} />
          <Table title="Top provinces" headers={["Province", "Code", "Total", "Actifs"]} rows={(charts.by_province ?? []).slice(0, 8).map((r) => [r.name, r.code, r.total, r.active])} />
          <div className="grid grid-cols-2 gap-8 border-t pt-6">
            <div><p className="text-[10px] uppercase text-slate-500">Validé par</p><div className="mt-8 border-b border-slate-400" /></div>
            <div><p className="text-[10px] uppercase text-slate-500">Cachet</p><div className="mt-4 h-16 rounded border border-dashed border-slate-300" /></div>
          </div>
        </section>
      </ReportPage>
    </>
  );
}

function MembresReport({ payload }: { payload: ReportPayload }) {
  const { charts } = payload;
  return (
    <ReportPage payload={payload} page={1} total={1} pageLabel="Profil démographique">
      <section className="space-y-5">
        <Table title="Tranches d'âge" headers={["Tranche", "Effectif"]} rows={(charts.by_age_range ?? []).map((r) => [r.label, r.total])} />
        <Table title="Sexe" headers={["Sexe", "Effectif"]} rows={(charts.by_gender ?? []).map((r) => [r.label, r.total])} />
        <Table title="Professions" headers={["Profession", "Effectif"]} rows={(charts.by_profession ?? []).map((r) => [r.label, r.total])} />
        <Table title="Compétences" headers={["Compétence", "Membres"]} rows={(charts.top_skills ?? []).map((r) => [r.label, r.total])} />
      </section>
    </ReportPage>
  );
}

function TerritoireReport({ payload }: { payload: ReportPayload }) {
  const { charts, overview } = payload;
  return (
    <ReportPage payload={payload} page={1} total={1} pageLabel="Couverture géographique">
      <section className="space-y-5">
        <Table title="Membres par province" headers={["Province", "Code", "Total", "Actifs"]} rows={(charts.by_province ?? []).map((r) => [r.name, r.code, r.total, r.active])} />
        {(charts.by_city ?? []).length > 0 && <Table title="Par ville" headers={["Ville", "Type", "Effectif"]} rows={(charts.by_city ?? []).map((r) => [r.name, r.type, r.total])} />}
        <p className="text-[11px] text-slate-600">Couverture : {formatNumber(overview.kpis.coverage.provinces)} provinces, {formatNumber(overview.kpis.coverage.cities)} villes, {formatNumber(overview.kpis.coverage.structures)} structures.</p>
      </section>
    </ReportPage>
  );
}

function MobilisationReport({ payload }: { payload: ReportPayload }) {
  const { overview, charts } = payload;
  const k = overview.kpis;
  return (
    <ReportPage payload={payload} page={1} total={1} pageLabel="Mobilisation">
      <section className="space-y-5">
        <Table title="Indicateurs" headers={["Indicateur", "Valeur"]} rows={[["Activités totales", k.activities.total], ["À venir", k.activities.upcoming], ["Vérifications (30 j)", k.verifications.last_30_days]]} />
        <Table title="Par type d'activité" headers={["Type", "Nombre"]} rows={(charts.by_activity ?? []).map((r) => [r.label, r.total])} />
        {overview.recent.length > 0 && <Table title="Événements récents" headers={["Événement", "Référence", "Statut"]} rows={overview.recent.slice(0, 6).map((r) => [r.label, r.reference ?? "—", r.status ?? "—"])} />}
      </section>
    </ReportPage>
  );
}

export function ReportDocument({ payload }: { payload: ReportPayload }) {
  if (payload.type === "synthese") return <SyntheseReport payload={payload} />;
  if (payload.type === "membres") return <MembresReport payload={payload} />;
  if (payload.type === "territoire") return <TerritoireReport payload={payload} />;
  return <MobilisationReport payload={payload} />;
}
