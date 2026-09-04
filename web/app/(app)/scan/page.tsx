"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Fingerprint,
  MapPin,
  QrCode,
  ScanFace,
} from "lucide-react";
import { ActivityCoverImage } from "@/components/activities/activity-cover-image";
import { AttendanceSheetSection } from "@/components/attendance/attendance-sheet-section";
import {
  FingerprintAttendancePanel,
  type FingerprintAttendanceResult,
} from "@/components/attendance/fingerprint-attendance-panel";
import { ScanHero } from "@/components/attendance/scan-hero";
import { ScanResultPanel, type ScanResultData } from "@/components/attendance/scan-result-panel";
import { BiometricModal, type BiometricResult } from "@/components/biometrics/biometric-modal";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { RequirePermission } from "@/components/auth/require-permission";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { EmptyState, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { Activity, Paginated } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

type ScanMode = "biometric" | "qr" | "fingerprint";

export default function ScanPage() {
  return (
    <RequirePermission permission={PERMISSIONS.attendanceRecord}>
      <Suspense fallback={<PageLoader label="Chargement du scan…" />}>
        <ScanTool />
      </Suspense>
    </RequirePermission>
  );
}

function ScanTool() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const activities = useApi<Paginated<Activity>>("/activities/for-attendance", { per_page: 50 });
  const [activityId, setActivityId] = useState("");
  const [mode, setMode] = useState<ScanMode>("biometric");
  const [loading, setLoading] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [sheetRefreshKey, setSheetRefreshKey] = useState(0);

  useEffect(() => {
    const fromQuery = searchParams.get("activity");
    if (fromQuery) setActivityId(fromQuery);
  }, [searchParams]);

  const selectedActivity = (activities.data?.data ?? []).find((item) => String(item.id) === activityId);

  const attendanceRate = useMemo(() => {
    if (!selectedActivity?.participants_count) return null;
    const present = selectedActivity.attendances_count ?? 0;
    return Math.round((present / selectedActivity.participants_count) * 100);
  }, [selectedActivity]);

  function refreshSheet() {
    setSheetRefreshKey((key) => key + 1);
    activities.reload();
  }

  function markSuccess(payload: ScanResultData) {
    setResult(payload);
    setError(null);
    setSessionCount((count) => count + 1);
    refreshSheet();
  }

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
      const response = await api.post<{ message: string; data?: { member?: ScanResultData["member"] } }>(
        `/activities/${activityId}/attendance`,
        payload,
      );
      const member = response.data?.member;
      markSuccess({
        message: response.message,
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
    markSuccess({
      message: biometricResult.message,
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
  }

  function handleFingerprintRecorded(fingerprintResult: FingerprintAttendanceResult) {
    if (!fingerprintResult.valid || !activityId) return;
    markSuccess({
      message: fingerprintResult.message,
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
  }

  function resetSelection() {
    setActivityId("");
    setResult(null);
    setError(null);
  }

  const options = (activities.data?.data ?? []).map((activity) => ({
    value: activity.id,
    label: `${activity.title} (${activity.code})`,
  }));

  if (activities.loading && !activities.data) return <PageLoader />;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/presences", label: "Présences" }, { label: "Scanner" }]} />

      <DashboardAnimate>
        <ScanHero sessionCount={sessionCount} />
      </DashboardAnimate>

      <DashboardAnimate delay={40}>
        <Card className="overflow-hidden">
          <div className="grid md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_260px]">
            <CardBody className="space-y-4">
              <Select
                label="Activité en cours"
                required
                placeholder="Choisir l'activité à pointer"
                value={activityId}
                onChange={(e) => {
                  setActivityId(e.target.value);
                  setResult(null);
                  setError(null);
                }}
                options={options}
              />
              {selectedActivity ? (
                <div className="flex flex-wrap gap-2">
                  <Link href={`/presences/${selectedActivity.id}`}>
                    <Button variant="outline" size="sm">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Feuille de présence
                    </Button>
                  </Link>
                  <Link href={`/activites/${selectedActivity.id}`}>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Détail activité
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Sélectionnez l&apos;activité pour laquelle vous enregistrez les présences.
                </p>
              )}
            </CardBody>

            <ActivityCoverImage
              url={selectedActivity?.image_url ?? null}
              alt={selectedActivity?.title ?? ""}
              className="hidden h-full min-h-[140px] w-full md:block"
            />
          </div>

          {selectedActivity ? (
            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{selectedActivity.title}</p>
                <span className="font-mono text-xs text-brand-700">{selectedActivity.code}</span>
                {selectedActivity.starts_at ? (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    {formatDateTime(selectedActivity.starts_at)}
                  </span>
                ) : null}
                {selectedActivity.location ? (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {selectedActivity.location}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>
      </DashboardAnimate>

      {selectedActivity ? (
        <>
          <DashboardAnimate delay={60}>
            <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-3")}>
              <KpiCard
                label="Participants attendus"
                value={formatNumber(selectedActivity.participants_count ?? 0)}
                icon={CalendarDays}
                tone="info"
              />
              <KpiCard
                label="Présences confirmées"
                value={formatNumber(selectedActivity.attendances_count ?? 0)}
                icon={ScanFace}
                tone="success"
              />
              <KpiCard
                label="Taux de présence"
                value={attendanceRate !== null ? `${attendanceRate} %` : "—"}
                icon={ClipboardList}
                tone="warning"
              />
            </div>
          </DashboardAnimate>

          <DashboardAnimate delay={80}>
            <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
              {(
                [
                  { id: "biometric" as const, label: "Windows Hello", icon: ScanFace },
                  { id: "qr" as const, label: "QR / Code membre", icon: QrCode },
                  { id: "fingerprint" as const, label: "Empreinte digitale", icon: Fingerprint },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none",
                    mode === item.id
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-brand-50",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.id === "biometric" ? "Hello" : item.id === "qr" ? "QR" : "Empreinte"}</span>
                </button>
              ))}
            </nav>
          </DashboardAnimate>

          <DashboardAnimate delay={100}>
            <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
              <Card className="overflow-hidden">
                {mode === "biometric" ? (
                  <>
                    <CardHeader
                      title="Windows Hello"
                      description="Authentification biométrique pour le pointage de présence"
                    />
                    <CardBody className="space-y-4">
                      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white">
                        <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                          <ScanFace className="h-8 w-8" />
                        </span>
                        <p className="text-sm text-brand-100/90">
                          Placez-vous face à la caméra ou utilisez votre lecteur biométrique enregistré.
                        </p>
                        <Button
                          type="button"
                          className="mt-5 w-full bg-white text-brand-800 hover:bg-brand-50"
                          size="lg"
                          onClick={() => setBiometricOpen(true)}
                          disabled={loading}
                        >
                          <ScanFace className="h-5 w-5" />
                          Lancer le scan
                        </Button>
                      </div>
                      <p className="text-center text-[11px] text-slate-500">
                        Méthode active pour les tests — migration empreinte digitale prévue.
                      </p>
                    </CardBody>
                  </>
                ) : null}

                {mode === "qr" ? (
                  <>
                    <CardHeader
                      title="Scanner ou saisir"
                      description="QR code de la carte ou identifiant JP-RDC-XXXXXXXX"
                    />
                    <CardBody>
                      <QrScannerPanel onScan={recordScan} loading={loading} />
                    </CardBody>
                  </>
                ) : null}

                {mode === "fingerprint" ? (
                  <>
                    <CardHeader
                      title="Empreinte digitale"
                      description="Lecteur biométrique ou simulation laboratoire"
                    />
                    <CardBody>
                      <FingerprintAttendancePanel
                        activityId={Number(activityId)}
                        loading={loading}
                        onLoadingChange={setLoading}
                        onRecorded={handleFingerprintRecorded}
                      />
                    </CardBody>
                  </>
                ) : null}
              </Card>

              <ScanResultPanel
                result={result}
                error={error}
                onClear={() => {
                  setResult(null);
                  setError(null);
                }}
              />
            </div>
          </DashboardAnimate>

          <DashboardAnimate delay={120}>
            <AttendanceSheetSection
              activityId={activityId}
              refreshKey={sheetRefreshKey}
              recordedOnly
              title="Présences confirmées"
              description="Membres ayant confirmé leur présence pour cette activité"
            />
          </DashboardAnimate>
        </>
      ) : (
        <DashboardAnimate delay={60}>
          <Card>
            <EmptyState
              icon={CalendarDays}
              title="Sélectionnez une activité"
              description="Choisissez l'activité en cours dans la liste ci-dessus pour activer les méthodes de pointage."
              action={
                options.length ? (
                  <Button variant="outline" size="sm" onClick={() => setActivityId(String(options[0].value))}>
                    Sélectionner la première activité
                  </Button>
                ) : (
                  <Link href="/activites">
                    <Button variant="outline" size="sm">
                      Voir les activités
                    </Button>
                  </Link>
                )
              }
            />
          </Card>
        </DashboardAnimate>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Link href="/verification">
          <Button variant="outline" size="sm">
            Vérifier une carte
          </Button>
        </Link>
        {activityId ? (
          <Button variant="ghost" size="sm" onClick={resetSelection}>
            Changer d&apos;activité
          </Button>
        ) : null}
      </div>

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
