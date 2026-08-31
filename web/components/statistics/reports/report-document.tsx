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
import {
  ReportPdfKpiGrid,
  ReportPdfPage,
  ReportPdfSignatureBlock,
  ReportPdfSummary,
  ReportPdfTable,
  type ReportPdfMeta,
} from "@/components/reports/report-pdf-layout";

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

function buildMeta(payload: ReportPayload, pageLabel?: string): ReportPdfMeta {
  const meta = REPORT_TYPES.find((item) => item.id === payload.type);
  return {
    title: REPORT_TITLES[payload.type],
    subtitle: meta?.description,
    generatedAt: payload.generatedAt,
    generatedBy: payload.generatedBy,
    scope: scopeLabel(payload.overview.scope),
    filters: {
      period: payload.filters.period,
      status: payload.filters.status,
    },
    pageLabel,
  };
}

function SyntheseReport({ payload }: { payload: ReportPayload }) {
  const { overview, charts } = payload;
  const k = overview.kpis;
  const rate = k.members.total > 0 ? Math.round((k.members.active / k.members.total) * 100) : 0;
  const meta = buildMeta(payload);

  return (
    <>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Synthèse exécutive" }} page={1} total={2}>
        <section className="space-y-5">
          <ReportPdfSummary>
            Au {formatDateLong(new Date(payload.generatedAt))}, Jeunesse Parle recense{" "}
            <strong>{formatNumber(k.members.total)}</strong> membres dont{" "}
            <strong>{formatNumber(k.members.active)}</strong> actifs ({rate} %). Couverture :{" "}
            {formatNumber(k.coverage.provinces)} provinces, {formatNumber(k.coverage.structures)} structures.
          </ReportPdfSummary>
          <ReportPdfKpiGrid
            items={[
              { label: "Membres total", value: k.members.total },
              { label: "Actifs", value: k.members.active },
              { label: "En attente", value: k.members.pending },
              { label: "Nouveaux (30 j)", value: k.members.new_last_30_days },
              { label: "Cartes actives", value: k.cards.active },
              { label: "Vérifications", value: k.verifications.last_30_days },
              { label: "Provinces", value: k.coverage.provinces },
              { label: "Structures", value: k.coverage.structures },
            ]}
          />
          <ReportPdfTable
            title="Répartition par statut"
            headers={["Statut", "Effectif", "Part"]}
            rows={(charts.by_status ?? []).map((r) => [
              r.label,
              r.total,
              k.members.total ? `${Math.round((r.total / k.members.total) * 100)} %` : "—",
            ])}
          />
        </section>
      </ReportPdfPage>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Tendances & territoire" }} page={2} total={2}>
        <section className="space-y-5">
          <ReportPdfTable
            title="Inscriptions récentes"
            headers={["Période", "Total"]}
            rows={(charts.registrations_trend ?? []).slice(-8).map((r) => [r.label, r.total])}
          />
          <ReportPdfTable
            title="Top provinces"
            headers={["Province", "Code", "Total", "Actifs"]}
            rows={(charts.by_province ?? []).slice(0, 8).map((r) => [r.name, r.code, r.total, r.active])}
          />
          <ReportPdfSignatureBlock />
        </section>
      </ReportPdfPage>
    </>
  );
}

function MembresReport({ payload }: { payload: ReportPayload }) {
  const { charts } = payload;
  const meta = buildMeta(payload, "Profil démographique");

  return (
    <ReportPdfPage meta={meta} page={1} total={1}>
      <section className="space-y-5">
        <ReportPdfTable
          title="Tranches d'âge"
          headers={["Tranche", "Effectif"]}
          rows={(charts.by_age_range ?? []).map((r) => [r.label, r.total])}
        />
        <ReportPdfTable
          title="Sexe"
          headers={["Sexe", "Effectif"]}
          rows={(charts.by_gender ?? []).map((r) => [r.label, r.total])}
        />
        <ReportPdfTable
          title="Professions"
          headers={["Profession", "Effectif"]}
          rows={(charts.by_profession ?? []).map((r) => [r.label, r.total])}
        />
        <ReportPdfTable
          title="Compétences"
          headers={["Compétence", "Membres"]}
          rows={(charts.top_skills ?? []).map((r) => [r.label, r.total])}
        />
      </section>
    </ReportPdfPage>
  );
}

function TerritoireReport({ payload }: { payload: ReportPayload }) {
  const { charts, overview } = payload;
  const meta = buildMeta(payload, "Couverture géographique");

  return (
    <ReportPdfPage meta={meta} page={1} total={1}>
      <section className="space-y-5">
        <ReportPdfTable
          title="Membres par province"
          headers={["Province", "Code", "Total", "Actifs"]}
          rows={(charts.by_province ?? []).map((r) => [r.name, r.code, r.total, r.active])}
        />
        {(charts.by_city ?? []).length > 0 && (
          <ReportPdfTable
            title="Par ville"
            headers={["Ville", "Type", "Effectif"]}
            rows={(charts.by_city ?? []).map((r) => [r.name, r.type, r.total])}
          />
        )}
        <p className="text-[11px] text-slate-600">
          Couverture : {formatNumber(overview.kpis.coverage.provinces)} provinces,{" "}
          {formatNumber(overview.kpis.coverage.cities)} villes,{" "}
          {formatNumber(overview.kpis.coverage.structures)} structures.
        </p>
      </section>
    </ReportPdfPage>
  );
}

function MobilisationReport({ payload }: { payload: ReportPayload }) {
  const { overview, charts } = payload;
  const k = overview.kpis;
  const meta = buildMeta(payload, "Mobilisation");

  return (
    <ReportPdfPage meta={meta} page={1} total={1}>
      <section className="space-y-5">
        <ReportPdfTable
          title="Indicateurs"
          headers={["Indicateur", "Valeur"]}
          rows={[
            ["Activités totales", k.activities.total],
            ["À venir", k.activities.upcoming],
            ["Vérifications (30 j)", k.verifications.last_30_days],
          ]}
        />
        <ReportPdfTable
          title="Par type d'activité"
          headers={["Type", "Nombre"]}
          rows={(charts.by_activity ?? []).map((r) => [r.label, r.total])}
        />
        {overview.recent.length > 0 && (
          <ReportPdfTable
            title="Événements récents"
            headers={["Événement", "Référence", "Statut"]}
            rows={overview.recent.slice(0, 6).map((r) => [r.label, r.reference ?? "—", r.status ?? "—"])}
          />
        )}
      </section>
    </ReportPdfPage>
  );
}

export function ReportDocument({ payload }: { payload: ReportPayload }) {
  if (payload.type === "synthese") return <SyntheseReport payload={payload} />;
  if (payload.type === "membres") return <MembresReport payload={payload} />;
  if (payload.type === "territoire") return <TerritoireReport payload={payload} />;
  return <MobilisationReport payload={payload} />;
}

// Re-export labels for filter chips in builder panel
export { PERIOD_LABELS, STATUS_LABELS };
