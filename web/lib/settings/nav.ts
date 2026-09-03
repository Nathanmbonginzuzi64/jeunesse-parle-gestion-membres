import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CreditCard,
  Database,
  Fingerprint,
  Globe2,
  HelpCircle,
  Info,
  KeyRound,
  Lock,
  MessageSquare,
  MonitorSmartphone,
  Settings,
  Shield,
  UserCircle,
  Users,
  Wrench,
  MapPinned,
} from "lucide-react";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import type { AuthUser } from "@/lib/types";

export type SettingsSectionId =
  | "profil"
  | "securite"
  | "biometrie"
  | "ma-carte"
  | "messagerie"
  | "notifications"
  | "confidentialite"
  | "appareils"
  | "stockage"
  | "apparence"
  | "aide"
  | "a-propos"
  | "perimetre"
  | "administration"
  | "systeme";

export interface SettingsNavItem {
  id: SettingsSectionId;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "personnel" | "perimetre" | "administration";
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    id: "profil",
    href: "/parametres/profil",
    label: "Mon profil",
    description: "Identité et coordonnées",
    icon: UserCircle,
    group: "personnel",
  },
  {
    id: "securite",
    href: "/parametres/securite",
    label: "Sécurité",
    description: "Mot de passe et 2FA",
    icon: KeyRound,
    group: "personnel",
  },
  {
    id: "biometrie",
    href: "/parametres/biometrie",
    label: "Biométrie",
    description: "Passkeys et empreintes",
    icon: Fingerprint,
    group: "personnel",
  },
  {
    id: "ma-carte",
    href: "/parametres/ma-carte",
    label: "Ma carte membre",
    description: "Carte Jeunesse Parle",
    icon: CreditCard,
    group: "personnel",
  },
  {
    id: "messagerie",
    href: "/parametres/messagerie",
    label: "Messagerie",
    description: "Confidentialité JP Message",
    icon: MessageSquare,
    group: "personnel",
  },
  {
    id: "notifications",
    href: "/parametres/notifications",
    label: "Notifications",
    description: "Alertes et canaux",
    icon: Bell,
    group: "personnel",
  },
  {
    id: "confidentialite",
    href: "/parametres/confidentialite",
    label: "Confidentialité",
    description: "Visibilité du profil",
    icon: Lock,
    group: "personnel",
  },
  {
    id: "appareils",
    href: "/parametres/appareils",
    label: "Appareils connectés",
    description: "Sessions actives",
    icon: MonitorSmartphone,
    group: "personnel",
  },
  {
    id: "stockage",
    href: "/parametres/stockage",
    label: "Stockage et données",
    description: "Cache et médias",
    icon: Database,
    group: "personnel",
  },
  {
    id: "apparence",
    href: "/parametres/apparence",
    label: "Langue & apparence",
    description: "Thème et interface",
    icon: Globe2,
    group: "personnel",
  },
  {
    id: "aide",
    href: "/parametres/aide",
    label: "Aide & assistance",
    description: "FAQ et support",
    icon: HelpCircle,
    group: "personnel",
  },
  {
    id: "a-propos",
    href: "/parametres/a-propos",
    label: "À propos",
    description: "Version et mentions",
    icon: Info,
    group: "personnel",
  },
  {
    id: "perimetre",
    href: "/parametres/perimetre",
    label: "Mon périmètre",
    description: "Espace de responsabilité",
    icon: MapPinned,
    group: "perimetre",
  },
  {
    id: "administration",
    href: "/parametres/administration",
    label: "Administration",
    description: "Modules administratifs",
    icon: Users,
    group: "administration",
  },
  {
    id: "systeme",
    href: "/parametres/administration/systeme",
    label: "Configuration système",
    description: "Paramètres plateforme",
    icon: Wrench,
    group: "administration",
  },
];

export function canSeeSettingsSection(
  item: SettingsNavItem,
  user: AuthUser | null,
  can: (permission: string | string[]) => boolean,
): boolean {
  if (!user) return false;

  switch (item.id) {
    case "ma-carte":
      return Boolean(user.member_id);
    case "perimetre": {
      const slug = user.role?.slug;
      if (!slug || slug === ROLE_SLUGS.membre || slug === ROLE_SLUGS.agentVerification) return false;
      return (
        can([
          PERMISSIONS.membersView,
          PERMISSIONS.structuresView,
          PERMISSIONS.activitiesView,
          PERMISSIONS.statisticsView,
        ]) || Boolean(user.scope.structure_id || user.scope.province_id || user.scope.city_id)
      );
    }
    case "administration":
      return can([
        PERMISSIONS.usersView,
        PERMISSIONS.rolesManage,
        PERMISSIONS.auditView,
        PERMISSIONS.cardsView,
        PERMISSIONS.territoriesManage,
        PERMISSIONS.structuresManage,
        PERMISSIONS.notificationsSend,
        PERMISSIONS.settingsManage,
      ]);
    case "systeme":
      return can(PERMISSIONS.settingsManage);
    default:
      return true;
  }
}

export function visibleSettingsNav(
  user: AuthUser | null,
  can: (permission: string | string[]) => boolean,
): SettingsNavItem[] {
  return SETTINGS_NAV.filter((item) => canSeeSettingsSection(item, user, can));
}

export function firstSettingsHref(
  user: AuthUser | null,
  can: (permission: string | string[]) => boolean,
): string {
  return visibleSettingsNav(user, can)[0]?.href ?? "/parametres/profil";
}

export const SETTINGS_GROUP_LABELS: Record<SettingsNavItem["group"], string> = {
  personnel: "Personnel",
  perimetre: "Périmètre",
  administration: "Administration",
};

export const SETTINGS_HUB_ICON = Settings;
export const SETTINGS_SECURITY_ICON = Shield;
