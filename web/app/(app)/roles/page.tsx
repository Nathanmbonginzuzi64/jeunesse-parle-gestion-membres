"use client";

import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { RoleDetail } from "@/lib/types";
import { Check } from "lucide-react";

export default function RolesPage() {
  return (
    <RequirePermission permission={[PERMISSIONS.rolesManage, PERMISSIONS.usersView]}>
      <RolesContent />
    </RequirePermission>
  );
}

function RolesContent() {
  const { data, loading, error } = useApi<{ data: RoleDetail[] }>("/roles");

  if (loading) return <PageLoader />;
  if (error) return <Alert tone="error">{error}</Alert>;

  return (
    <div>
      <Breadcrumb items={[{ href: "/utilisateurs", label: "Administration" }, { label: "Rôles" }]} />
      <PageHeader title="Rôles & permissions" description="Vue des droits par rôle. La modification fine reste côté serveur." />
      <div className="grid gap-4 lg:grid-cols-2">
        {(data?.data ?? []).map((role) => (
          <Card key={role.id}>
            <CardHeader
              title={role.name}
              description={`${role.users_count} utilisateur${role.users_count > 1 ? "s" : ""} · niveau ${role.scope_level}`}
            />
            <CardBody>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {permission}
                  </li>
                ))}
                {role.permissions.length === 0 && (
                  <li className="text-sm text-slate-500">Aucune permission applicative (espace membre).</li>
                )}
              </ul>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
