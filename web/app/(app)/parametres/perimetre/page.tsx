"use client";

import Link from "next/link";
import {
  Building2,
  CalendarDays,
  Map,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function ParametresPerimetrePage() {
  const { user, can } = useAuth();
  const scope = [user?.scope.province, user?.scope.city, user?.scope.structure].filter(Boolean).join(" · ");

  const links = [
    can(PERMISSIONS.membersView) && {
      href: "/membres",
      label: "Membres de mon périmètre",
      icon: Users,
    },
    can(PERMISSIONS.structuresView) && {
      href: "/structures",
      label: "Structures",
      icon: Building2,
    },
    can(PERMISSIONS.activitiesView) && {
      href: "/activites",
      label: "Activités",
      icon: CalendarDays,
    },
    can(PERMISSIONS.mapView) && {
      href: "/cartographie",
      label: "Cartographie",
      icon: Map,
    },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: typeof Users }>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Mon périmètre"
          description={scope || "Espace de responsabilité lié à votre rôle"}
        />
        <CardBody className="space-y-2">
          <p className="text-sm text-slate-600">
            Rôle : <strong>{user?.role?.name ?? "—"}</strong>
          </p>
          <p className="text-xs text-slate-500">
            Vous ne pouvez pas modifier les paramètres nationaux ni les rôles globaux depuis cet espace.
          </p>
        </CardBody>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:bg-slate-50"
            >
              <Icon className="mt-0.5 h-5 w-5 text-brand-600" />
              <span className="text-sm font-medium text-slate-900">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
