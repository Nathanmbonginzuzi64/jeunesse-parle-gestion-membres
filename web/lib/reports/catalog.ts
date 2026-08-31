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
    description: "Liste hiérarchique RDC → Avenue avec statut carte, biométrie et export PDF.",
    icon: Users,
    permission: PERMISSIONS.statisticsView,
    badge: "PDF",
  },
  {
    id: "activities",
    href: "/rapports/activites",
    label: "Rapport des activités",
    description: "Activités, participants, présences et classification par type — export PDF.",
    icon: Activity,
    permission: PERMISSIONS.statisticsView,
    badge: "PDF",
  },
  {
    id: "cards",
    href: "/rapports/cartes",
    label: "Rapport des cartes",
    description: "Cartes générées, actives, expirées, suspendues et historique par membre — PDF.",
    icon: CreditCard,
    permission: PERMISSIONS.statisticsView,
    badge: "PDF",
  },
  {
    id: "attendance",
    href: "/rapports/presences",
    label: "Rapport des présences",
    description: "Taux de participation global et analyse par type d'activité — export PDF.",
    icon: UserCheck,
    permission: PERMISSIONS.statisticsView,
    badge: "PDF",
  },
  {
    id: "users",
    href: "/rapports/utilisateurs",
    label: "Utilisateurs système",
    description: "Comptes actifs, suspendus, rôles et dernières connexions — PDF.",
    icon: Users,
    permission: PERMISSIONS.usersView,
    badge: "PDF",
  },
  {
    id: "roles",
    href: "/rapports/roles",
    label: "Rôles & permissions",
    description: "Matrice RBAC — modules accessibles et actions autorisées par rôle — PDF.",
    icon: Shield,
    permission: PERMISSIONS.usersView,
    badge: "PDF",
  },
  {
    id: "news",
    href: "/rapports/actualites",
    label: "Rapport actualités",
    description: "Publications, vues, likes, commentaires et engagement — export PDF.",
    icon: Newspaper,
    permission: PERMISSIONS.statisticsView,
    badge: "PDF",
  },
  {
    id: "exports",
    href: "/statistiques/rapports",
    label: "Rapports institutionnels",
    description: "Synthèse nationale, territoire, mobilisation et profil démographique — PDF officiel.",
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
