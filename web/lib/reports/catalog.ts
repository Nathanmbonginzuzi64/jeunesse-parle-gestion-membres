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

export interface ReportCatalogItem {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  permission?: string;
  badge?: string;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    id: "dashboard",
    href: "/statistiques",
    label: "Tableau de bord analytique",
    description: "KPI nationaux, graphiques d'évolution, répartition démographique et couverture territoriale.",
    icon: BarChart3,
    permission: PERMISSIONS.statisticsView,
  },
  {
    id: "members",
    href: "/rapports/membres",
    label: "Membres par localisation",
    description: "Liste hiérarchique RDC → Avenue avec statut carte, biométrie et export CSV.",
    icon: Users,
    permission: PERMISSIONS.statisticsView,
  },
  {
    id: "activities",
    href: "/rapports/activites",
    label: "Rapport des activités",
    description: "Activités, participants, présences et classification par type.",
    icon: Activity,
    permission: PERMISSIONS.statisticsView,
  },
  {
    id: "cards",
    href: "/rapports/cartes",
    label: "Rapport des cartes",
    description: "Cartes générées, actives, expirées, suspendues et historique par membre.",
    icon: CreditCard,
    permission: PERMISSIONS.statisticsView,
  },
  {
    id: "attendance",
    href: "/rapports/presences",
    label: "Rapport des présences",
    description: "Taux de participation global et analyse par type d'activité.",
    icon: UserCheck,
    permission: PERMISSIONS.statisticsView,
  },
  {
    id: "users",
    href: "/rapports/utilisateurs",
    label: "Utilisateurs système",
    description: "Comptes actifs, suspendus, rôles et dernières connexions.",
    icon: Users,
    permission: PERMISSIONS.usersView,
  },
  {
    id: "roles",
    href: "/rapports/roles",
    label: "Rôles & permissions",
    description: "Matrice RBAC — modules accessibles et actions autorisées par rôle.",
    icon: Shield,
    permission: PERMISSIONS.usersView,
  },
  {
    id: "news",
    href: "/rapports/actualites",
    label: "Rapport actualités",
    description: "Publications, vues, likes, commentaires et engagement.",
    icon: Newspaper,
    permission: PERMISSIONS.statisticsView,
  },
  {
    id: "exports",
    href: "/statistiques/rapports",
    label: "Exports PDF institutionnels",
    description: "Rapports officiels avec logo Jeunesse Parle — synthèse, territoire, mobilisation.",
    icon: FileText,
    permission: PERMISSIONS.statisticsView,
    badge: "PDF",
  },
  {
    id: "audit",
    href: "/audit",
    label: "Journal d'audit",
    description: "Traçabilité complète — connexions, modifications, exports et vérifications.",
    icon: Shield,
    permission: PERMISSIONS.auditView,
  },
];
