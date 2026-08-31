import {
  Activity,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckSquare,
  Clock,
  CreditCard,
  IdCard,
  LayoutDashboard,
  LayoutGrid,
  Map,
  MessageSquare,
  Newspaper,
  ScanLine,
  Settings,
  ShieldCheck,
  ShieldOff,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permissions?: string[];
  requiresMember?: boolean;
  exact?: boolean;
  children?: NavItem[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Pilotage",
    items: [
      { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
      {
        href: "/statistiques",
        label: "Statistiques",
        icon: BarChart3,
        permissions: [PERMISSIONS.statisticsView],
        children: [
          { href: "/statistiques", label: "Analyses", icon: BarChart3, exact: true },
          { href: "/rapports", label: "Rapports & Analyses", icon: CheckSquare, permissions: [PERMISSIONS.statisticsView] },
          { href: "/statistiques/rapports", label: "Exports PDF", icon: CheckSquare, permissions: [PERMISSIONS.statisticsView] },
        ],
      },
      { href: "/cartographie", label: "Cartographie", icon: Map, permissions: [PERMISSIONS.mapView] },
    ],
  },
  {
    title: "Membres",
    items: [
      {
        href: "/membres",
        label: "Membres",
        icon: Users,
        permissions: [PERMISSIONS.membersView],
        children: [
          { href: "/membres", label: "Tous les membres", icon: Users, exact: true },
          { href: "/membres?status=active", label: "Membres actifs", icon: Users },
          { href: "/membres?status=pending", label: "En attente", icon: Users },
          { href: "/membres?status=suspended", label: "Suspendus", icon: Users },
        ],
      },
      {
        href: "/cartes",
        label: "Cartes membres",
        icon: CreditCard,
        permissions: [PERMISSIONS.cardsView],
        children: [
          { href: "/cartes", label: "Toutes", icon: CreditCard, exact: true },
          { href: "/cartes/galerie", label: "Galerie visuelle", icon: LayoutGrid },
          { href: "/cartes?status=active", label: "Actives", icon: BadgeCheck },
          { href: "/cartes?status=expired", label: "Expirées", icon: Clock },
          { href: "/cartes?status=suspended", label: "Suspendues", icon: ShieldOff },
        ],
      },
      {
        href: "/verification",
        label: "Vérification",
        icon: ScanLine,
        permissions: [PERMISSIONS.cardsVerify],
      },
      {
        href: "/structures",
        label: "Structures",
        icon: Building2,
        permissions: [PERMISSIONS.structuresView],
      },
    ],
  },
  {
    title: "Mobilisation",
    items: [
      {
        href: "/activites",
        label: "Activités",
        icon: CalendarDays,
        permissions: [PERMISSIONS.activitiesView],
      },
      {
        href: "/presences",
        label: "Présences",
        icon: CheckSquare,
        permissions: [PERMISSIONS.attendanceView],
      },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/actualites", label: "JP Actualités", icon: Newspaper },
      { href: "/jp-message", label: "JP Message", icon: MessageSquare, requiresMember: true },
      { href: "/jp-message/gestion", label: "JP Message (admin)", icon: MessageSquare, permissions: [PERMISSIONS.usersView] },
    ],
  },
  {
    title: "Mon espace",
    items: [
      { href: "/mon-espace", label: "Mon profil", icon: IdCard, requiresMember: true },
      { href: "/ma-carte", label: "Ma carte", icon: CreditCard, requiresMember: true },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        href: "/utilisateurs",
        label: "Utilisateurs",
        icon: UserCog,
        permissions: [PERMISSIONS.usersView],
      },
      {
        href: "/roles",
        label: "Rôles & permissions",
        icon: ShieldCheck,
        permissions: [PERMISSIONS.rolesManage, PERMISSIONS.usersView],
      },
      {
        href: "/audit",
        label: "Journal d'audit",
        icon: ShieldCheck,
        permissions: [PERMISSIONS.auditView],
      },
      {
        href: "/parametres",
        label: "Paramètres",
        icon: Settings,
        permissions: [PERMISSIONS.settingsManage],
      },
    ],
  },
];

export const FALLBACK_ICON = Activity;
