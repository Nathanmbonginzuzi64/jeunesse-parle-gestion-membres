"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/topbar";
import { Can } from "@/components/auth/require-permission";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { ActivityStatusBadge, AttendanceStatusBadge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { DefinitionList } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Activity, AttendanceSheet } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function ActivityShowPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const activity = useApi<{ data: Activity }>(`/activities/${params.id}`);
  const sheet = useApi<AttendanceSheet>(`/activities/${params.id}/attendance/sheet`);
  const [busy, setBusy] = useState(false);

  async function record(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/activities/${params.id}/attendance`, payload);
      toast.success(response.message);
      sheet.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Pointage impossible.");
    } finally {
      setBusy(false);
    }
  }

  function handleScan(value: string) {
    const trimmed = value.trim();
    if (trimmed.toUpperCase().startsWith("JP-RDC-")) {
      void record({ member_code: trimmed });
    } else {
      void record({ qr_token: extractTokenFromQr(trimmed) });
    }
  }

  if (activity.loading) return <PageLoader />;
  if (activity.error || !activity.data?.data) {
    return <Alert tone="error">{activity.error ?? "Activité introuvable."}</Alert>;
  }

  const item = activity.data.data;
  const summary = sheet.data?.summary;

  return (
    <div>
      <Breadcrumb items={[{ href: "/activites", label: "Mobilisation" }, { label: item.title }]} />
      <PageHeader
        title={item.title}
        description={item.code}
        actions={<ActivityStatusBadge status={item.status} label={item.status_label} />}
      />

      <DefinitionList
        items={[
          { label: "Type", value: item.type_label },
          { label: "Début", value: formatDateTime(item.starts_at) },
          { label: "Lieu", value: item.location },
          { label: "Structure", value: item.structure?.name },
          { label: "Responsable", value: item.organizer?.name },
          { label: "Participants", value: item.participants_count },
        ]}
      />

      {item.description && <p className="mt-4 text-sm text-slate-600">{item.description}</p>}

      <Can permission={PERMISSIONS.attendanceRecord}>
        <Card className="mt-6">
          <CardHeader title="Pointer une présence" description="Scan QR ou identifiant membre." />
          <CardBody>
            <QrScannerPanel onScan={handleScan} loading={busy} />
          </CardBody>
        </Card>
      </Can>

      <Card className="mt-6">
        <CardHeader
          title="Feuille de présence"
          description={
            summary
              ? `${summary.present} présents · ${summary.absent} absents · ${summary.not_recorded} non pointés`
              : undefined
          }
        />
        <CardBody className="p-0">
          {!sheet.data?.rows.length && <EmptyState title="Aucun participant inscrit" />}
          <ul className="divide-y divide-slate-100">
            {sheet.data?.rows.map((row) => (
              <li key={row.member_id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Avatar src={row.photo_url} name={row.full_name} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{row.full_name}</p>
                    <p className="font-mono text-[11px] text-slate-400">{row.member_code}</p>
                  </div>
                </div>
                {row.status ? (
                  <AttendanceStatusBadge status={row.status} label={row.status_label} />
                ) : (
                  <span className="text-xs text-slate-400">Non pointé</span>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
