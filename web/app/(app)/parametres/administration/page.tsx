"use client";

import Link from "next/link";
import {
  Bell,
  CreditCard,
  Fingerprint,
  MessageSquare,
  ScrollText,
  ShieldCheck,
  UserCog,
  Wrench,
  MapPinned,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ParametresAdministrationPage() {
  const { can } = useAuth();

  const tiles = [
    {
      href: "/utilisateurs",
      label: "Utilisateurs & rôles",
      description: "Comptes, activation, accès modules",
      icon: UserCog,
      show: can([PERMISSIONS.usersView, PERMISSIONS.rolesManage]),
    },
    {
      href: "/roles",
      label: "Matrice de permissions",
      description: "Rôle → module → action",
      icon: ShieldCheck,
      show: can([PERMISSIONS.rolesManage, PERMISSIONS.usersView]),
    },
    {
      href: "/structures",
      label: "Organisation territoriale",
      description: "Structures et rattachements",
      icon: MapPinned,
      show: can([PERMISSIONS.structuresView, PERMISSIONS.territoriesManage]),
    },
    {
      href: "/cartes",
      label: "Configuration cartes",
      description: "Registre et émissions",
      icon: CreditCard,
      show: can(PERMISSIONS.cardsView),
    },
    {
      href: "/parametres/administration/systeme",
      label: "Notifications & système",
      description: "Canaux globaux, cartes, maintenance",
      icon: Bell,
      show: can(PERMISSIONS.settingsManage),
    },
    {
      href: "/parametres/biometrie",
      label: "Biométrie (compte)",
      description: "Credentials personnels WebAuthn",
      icon: Fingerprint,
      show: true,
    },
    {
      href: "/jp-message",
      label: "Messagerie",
      description: "Dossiers et conversations",
      icon: MessageSquare,
      show: true,
    },
    {
      href: "/audit",
      label: "Journal d'audit",
      description: "Traçabilité web et mobile",
      icon: ScrollText,
      show: can(PERMISSIONS.auditView),
    },
    {
      href: "/parametres/administration/systeme",
      label: "Configuration système",
      description: "Réservé super-admin",
      icon: Wrench,
      show: can(PERMISSIONS.settingsManage),
    },
  ].filter((tile) => tile.show);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Administration"
          description="Accès aux modules autorisés par vos permissions — le backend refuse toujours les appels non autorisés (403)."
        />
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={`${tile.href}-${tile.label}`}
              href={tile.href}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition",
                "hover:border-brand-200 hover:bg-slate-50",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-brand-700 ring-1 ring-slate-100">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900">{tile.label}</span>
                <span className="block text-xs text-slate-500">{tile.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <Card>
        <CardBody className="text-xs text-slate-500">
          Les paramètres système (logo, maintenance, politiques globales) restent derrière{" "}
          <code className="font-mono">settings.manage</code>.
        </CardBody>
      </Card>
    </div>
  );
}
