"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { RequirePermission } from "@/components/auth/require-permission";
import { PublicAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Activity, Paginated } from "@/lib/types";

interface ScanResult {
  message: string;
  attendance_recorded: boolean;
  member: {
    member_code: string;
    full_name: string;
    photo_url: string | null;
    status: string;
    structure: string | null;
    province: string | null;
  };
  activity: { id: number; title: string };
}

export default function ScanPage() {
  return (
    <RequirePermission permission={PERMISSIONS.attendanceRecord}>
      <ScanTool />
    </RequirePermission>
  );
}

function ScanTool() {
  const toast = useToast();
  const activities = useApi<Paginated<Activity>>("/activities", { tab: "upcoming", per_page: 50 });
  const [activityId, setActivityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function recordScan(value: string) {
    if (!activityId) {
      setError("Sélectionnez d'abord une activité.");
      return;
    }
    setLoading(true);
    setError(null);
    const token = value.trim();
    const payload = token.toUpperCase().startsWith("JP-RDC-")
      ? { activity_id: Number(activityId), member_code: token }
      : { activity_id: Number(activityId), qr_token: extractTokenFromQr(token) };

    try {
      const response = await api.post<ScanResult>("/scan/attendance", payload);
      setResult(response);
      toast.success(response.message);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof ApiError ? caught.message : "Pointage impossible.");
    } finally {
      setLoading(false);
    }
  }

  const options = (activities.data?.data ?? []).map((activity) => ({
    value: activity.id,
    label: `${activity.title} (${activity.code})`,
  }));

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Breadcrumb items={[{ href: "/presences", label: "Présences" }, { label: "Scanner" }]} />
      <PageHeader
        title="Scanner un membre"
        description="Pointage de présence pour une activité en cours."
        actions={
          <Link href="/verification">
            <Button variant="outline" size="sm">
              Vérifier une carte
            </Button>
          </Link>
        }
      />

      <Card>
        <CardBody className="space-y-4">
          <Select
            label="Activité"
            required
            placeholder="Choisir l'activité en cours"
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            options={options}
          />
          <QrScannerPanel onScan={recordScan} loading={loading} />
        </CardBody>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}

      {result?.attendance_recorded && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardBody className="space-y-3">
            <Alert tone="success">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Présence enregistrée
              </span>
            </Alert>
            <div className="flex items-center gap-3">
              <PublicAvatar src={result.member.photo_url} name={result.member.full_name} />
              <div>
                <p className="font-semibold">{result.member.full_name}</p>
                <p className="font-mono text-xs text-brand-700">{result.member.member_code}</p>
                <Badge tone="success">{result.member.status}</Badge>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              Activité : <strong>{result.activity.title}</strong>
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
