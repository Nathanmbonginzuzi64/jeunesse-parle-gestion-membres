import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckSquare,
  CreditCard,
  IdCard,
  LayoutDashboard,
  Map,
  ScanLine,
  Settings,
  ShieldCheck,
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
