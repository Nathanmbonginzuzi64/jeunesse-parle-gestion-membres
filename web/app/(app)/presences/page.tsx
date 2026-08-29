"use client";

import Link from "next/link";
import { ScanLine } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActivityStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { Activity, Paginated } from "@/lib/types";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default function AttendanceHubPage() {
  return (
    <RequirePermission permission={PERMISSIONS.attendanceView}>
      <AttendanceHub />
    </RequirePermission>
  );
}

function AttendanceHub() {
  const { data, loading, error } = useApi<Paginated<Activity>>("/activities", { per_page: 20 });

  return (
    <div>
      <Breadcrumb items={[{ href: "/activites", label: "Mobilisation" }, { label: "Présences" }]} />
      <PageHeader
        title="Présences"
        description="Taux de participation par activité."
        actions={
          <Link href="/scan">
            <Button>
              <ScanLine className="h-4 w-4" />
              Scanner un membre
            </Button>
          </Link>
        }
      />
      <Card>
        {error && <Alert tone="error">{error}</Alert>}
        {loading && <TableSkeleton />}
        {!loading && data && data.data.length === 0 && <EmptyState title="Aucune activité" />}
        {!loading && data && data.data.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Activité</Th>
                <Th>Statut</Th>
                <Th>Attendus</Th>
                <Th>Présents</Th>
                <Th>Taux</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((activity) => {
                const expected = activity.participants_count ?? 0;
                const present = activity.attendances_count ?? 0;
                const rate = expected ? Math.round((present / expected) * 100) : 0;
                return (
                  <Tr key={activity.id}>
                    <Td>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(activity.starts_at)}</p>
                    </Td>
                    <Td>
                      <ActivityStatusBadge status={activity.status} label={activity.status_label} />
                    </Td>
                    <Td className="tabular-nums">{formatNumber(expected)}</Td>
                    <Td className="tabular-nums">{formatNumber(present)}</Td>
                    <Td className="tabular-nums">{rate} %</Td>
                    <Td>
                      <Link href={`/activites/${activity.id}`} className="text-sm font-medium text-brand-700">
                        Feuille
                      </Link>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
