"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ScanFace } from "lucide-react";
import { BiometricModal, type BiometricResult } from "@/components/biometrics/biometric-modal";
import {
  FingerprintAttendancePanel,
  type FingerprintAttendanceResult,
} from "@/components/attendance/fingerprint-attendance-panel";
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
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedActivity = (activities.data?.data ?? []).find((item) => String(item.id) === activityId);

  async function recordScan(value: string) {
    if (!activityId) {
      setError("Sélectionnez d'abord une activité.");
      return;
    }
    setLoading(true);
    setError(null);
    const token = value.trim();
    const payload = token.toUpperCase().startsWith("JP-RDC-")
      ? { member_code: token }
      : { qr_token: extractTokenFromQr(token) };

    try {
      const response = await api.post<{ message: string; data?: { member?: ScanResult["member"] } }>(
        `/activities/${activityId}/attendance`,
        payload,
      );
      const member = response.data?.member;
      setResult({
        message: response.message,
        attendance_recorded: true,
        member: {
          member_code: member?.member_code ?? token,
          full_name: member?.full_name ?? "Membre",
          photo_url: member?.photo_url ?? null,
          status: member?.status ?? "Présent",
          structure: member?.structure ?? null,
          province: member?.province ?? null,
        },
        activity: { id: Number(activityId), title: selectedActivity?.title ?? "Activité" },
      });
      toast.success(response.message);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof ApiError ? caught.message : "Pointage impossible.");
    } finally {
      setLoading(false);
    }
  }

  function handleBiometric(biometricResult: BiometricResult) {
    if (!biometricResult.ok || !biometricResult.member || !activityId) return;
    setResult({
      message: biometricResult.message,
      attendance_recorded: true,
      member: {
        member_code: biometricResult.member.member_code,
        full_name: biometricResult.member.full_name,
        photo_url: biometricResult.member.photo_url ?? null,
        status: biometricResult.member.status_label ?? "Présent",
        structure: biometricResult.member.structure ?? null,
        province: biometricResult.member.province ?? null,
      },
      activity: { id: Number(activityId), title: selectedActivity?.title ?? "Activité" },
    });
    toast.success(biometricResult.message);
    setError(null);
  }

  function handleFingerprintRecorded(fingerprintResult: FingerprintAttendanceResult) {
    if (!fingerprintResult.valid || !activityId) return;
    setResult({
      message: fingerprintResult.message,
      attendance_recorded: true,
      member: {
        member_code: fingerprintResult.member_code ?? "",
        full_name: fingerprintResult.full_name ?? "",
        photo_url: fingerprintResult.photo_url ?? null,
        status: "Présent",
        structure: null,
        province: null,
      },
      activity: { id: Number(activityId), title: selectedActivity?.title ?? "Activité" },
    });
    toast.success(fingerprintResult.message);
    setError(null);
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
        description="Pointage par Windows Hello (test), QR code ou empreinte digitale."
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
            onChange={(e) => {
              setActivityId(e.target.value);
              setResult(null);
              setError(null);
            }}
            options={options}
          />

          {activityId ? (
            <>
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => setBiometricOpen(true)}
                disabled={loading}
              >
                <ScanFace className="h-5 w-5" />
                Scanner avec Windows Hello
              </Button>
              <p className="text-center text-[11px] text-slate-500">
                Méthode biométrique active pour les tests — migration empreinte digitale prévue.
              </p>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wide">
                  <span className="bg-white px-2 text-slate-400">ou scan QR</span>
                </div>
              </div>

              <QrScannerPanel onScan={recordScan} loading={loading} />

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wide">
                  <span className="bg-white px-2 text-slate-400">empreinte digitale (à venir)</span>
                </div>
              </div>

              <FingerprintAttendancePanel
                activityId={Number(activityId)}
                loading={loading}
                onLoadingChange={setLoading}
                onRecorded={handleFingerprintRecorded}
                compact
              />
            </>
          ) : (
            <Alert tone="info">Sélectionnez une activité pour activer le scan de présence.</Alert>
          )}
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

      {activityId ? (
        <BiometricModal
          open={biometricOpen}
          onClose={() => setBiometricOpen(false)}
          context="ATTENDANCE"
          activityId={Number(activityId)}
          onSuccess={handleBiometric}
        />
      ) : null}
    </div>
  );
}
