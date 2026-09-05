import {
  Activity,
  BarChart3,
  CreditCard,
  FileText,
  Newspaper,
  Shield,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";

export type ReportTone = "brand" | "sky" | "emerald" | "rose" | "violet" | "amber";

export interface ReportCatalogItem {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission?: string;
  /** Affiche un libellé discret « Export PDF » sous la description. */
  exportHint?: boolean;
  tone?: ReportTone;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: "dashboard",
    href: "/statistiques",
    label: "Tableau de bord analytique",
    description: "KPI nationaux, graphiques d'évolution, répartition démographique et couverture territoriale.",
    icon: BarChart3,
    permission: PERMISSIONS.statisticsView,
    tone: "brand",
  },
  {
    id: "members",
    href: "/rapports/membres",
    label: "Membres par localisation",
    description: "Liste hiérarchique RDC → Avenue avec statut carte, biométrie et export PDF.",
    icon: Users,
    permission: PERMISSIONS.statisticsView,
    exportHint: true,
    tone: "sky",
  },
  {
    id: "activities",
    href: "/rapports/activites",
    label: "Rapport des activités",
    description: "Activités, participants, présences et classification par type — export PDF.",
    icon: Activity,
    permission: PERMISSIONS.statisticsView,
    exportHint: true,
    tone: "emerald",
  },
  {
    id: "cards",
    href: "/rapports/cartes",
    label: "Rapport des cartes",
    description: "Cartes générées, actives, expirées, suspendues et historique par membre — PDF.",
    icon: CreditCard,
    permission: PERMISSIONS.statisticsView,
    exportHint: true,
    tone: "violet",
  },
  {
    id: "attendance",
    href: "/rapports/presences",
    label: "Rapport des présences",
    description: "Taux de participation global et analyse par type d'activité — export PDF.",
    icon: UserCheck,
    permission: PERMISSIONS.statisticsView,
    exportHint: true,
    tone: "rose",
  },
  {
    id: "users",
    href: "/rapports/utilisateurs",
    label: "Utilisateurs système",
    description: "Comptes actifs, suspendus, rôles et dernières connexions — PDF.",
    icon: Users,
    permission: PERMISSIONS.usersView,
    exportHint: true,
    tone: "sky",
  },
  {
    id: "roles",
    href: "/rapports/roles",
    label: "Rôles & permissions",
    description: "Matrice RBAC — modules accessibles et actions autorisées par rôle — PDF.",
    icon: Shield,
    permission: PERMISSIONS.usersView,
    exportHint: true,
    tone: "amber",
  },
  {
    id: "news",
    href: "/rapports/actualites",
    label: "Rapport actualités",
    description: "Publications, vues, likes, commentaires et engagement — export PDF.",
    icon: Newspaper,
    permission: PERMISSIONS.statisticsView,
    exportHint: true,
    tone: "rose",
  },
  {
    id: "exports",
    href: "/statistiques/rapports",
    label: "Rapports institutionnels",
    description: "Synthèse nationale, territoire, mobilisation et profil démographique — PDF officiel.",
    icon: FileText,
    permission: PERMISSIONS.statisticsView,
    exportHint: true,
    tone: "brand",
  },
  {
    id: "audit",
    href: "/audit",
    label: "Journal d'audit",
    description: "Traçabilité complète — connexions, modifications, exports et vérifications.",
    icon: Shield,
    permission: PERMISSIONS.auditView,
    tone: "violet",
  },
];

export const REPORT_TONE_STYLES: Record<
  ReportTone,
  { icon: string; soft: string; ring: string }
> = {
  brand: {
    icon: "bg-brand-50 text-brand-700 ring-brand-100",
    soft: "group-hover:border-brand-300",
    ring: "ring-brand-100",
  },
  sky: {
    icon: "bg-sky-50 text-sky-700 ring-sky-100",
    soft: "group-hover:border-sky-300",
    ring: "ring-sky-100",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    soft: "group-hover:border-emerald-300",
    ring: "ring-emerald-100",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700 ring-rose-100",
    soft: "group-hover:border-rose-300",
    ring: "ring-rose-100",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700 ring-violet-100",
    soft: "group-hover:border-violet-300",
    ring: "ring-violet-100",
  },
  amber: {
    icon: "bg-amber-50 text-amber-800 ring-amber-100",
    soft: "group-hover:border-amber-300",
    ring: "ring-amber-100",
  },
};
