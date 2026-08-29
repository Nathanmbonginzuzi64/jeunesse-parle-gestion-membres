import type { StatisticsCharts, StatisticsOverview } from "@/lib/types";

export type ReportType = "synthese" | "membres" | "territoire" | "mobilisation";

export interface ReportFilters {
  period: string;
  status: string;
  province_id: number | null;
  city_id: number | null;
  commune_id: number | null;
  structure_id: number | "";
}

export interface ReportPayload {
  type: ReportType;
  filters: ReportFilters;
  overview: StatisticsOverview;
  charts: StatisticsCharts;
  generatedAt: string;
  generatedBy?: string;
}

export const REPORT_TYPES: Array<{
  id: ReportType;
  label: string;
  description: string;
}> = [
  {
    id: "synthese",
    label: "Synthèse nationale",
    description: "Vue exécutive — KPI, couverture, statuts et tendances",
  },
  {
    id: "membres",
    label: "Profil des membres",
    description: "Démographie, professions et compétences",
  },
  {
    id: "territoire",
    label: "Couverture territoriale",
    description: "Répartition par provinces et villes",
  },
  {
    id: "mobilisation",
    label: "Mobilisation & activités",
    description: "Activités par type et indicateurs de participation",
  },
];

export const PERIOD_LABELS: Record<string, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
  "12m": "12 mois",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Actifs",
  pending: "En attente",
  suspended: "Suspendus",
  inactive: "Inactifs",
};
