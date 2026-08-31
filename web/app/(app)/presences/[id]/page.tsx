"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  MapPin,
  ScanFace,
  ScanLine,
  Search,
  UserCheck,
} from "lucide-react";
import { ActivityCoverImage } from "@/components/activities/activity-cover-image";
import { RequirePermission } from "@/components/auth/require-permission";
import { Can } from "@/components/auth/require-permission";
import { BiometricModal, type BiometricResult } from "@/components/biometrics/biometric-modal";
import {
  FingerprintAttendancePanel,
  type FingerprintAttendanceResult,
} from "@/components/attendance/fingerprint-attendance-panel";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { AttendanceSheetTable } from "@/components/attendance/attendance-sheet-table";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, PageLoader, TableSkeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Avatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/table";
import { api, ApiError, downloadFile } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { useApi, useDebounced } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { AttendanceSheet, VerificationResult } from "@/lib/types";
import { cn, formatDateTime, formatNumber } from "@/lib/utils";

interface IdentifiedMember {
  member_code: string;
  full_name: string;
  photo_url?: string | null;
  province?: string;
  commune?: string;
  structure?: string;
  status_label?: string;
  card_valid?: boolean;
}

export default function ActivityAttendancePage() {
  return (
    <RequirePermission permission={PERMISSIONS.attendanceView}>
      <AttendanceSheetPage />
    </RequirePermission>
  );
}

function AttendanceSheetPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [identified, setIdentified] = useState<IdentifiedMember | null>(null);
  const debouncedQ = useDebounced(q);

  const query = useMemo(
    () => ({
      page,
      per_page: perPage,
      q: debouncedQ || undefined,
      status: statusFilter || undefined,
      method: methodFilter || undefined,
    }),
    [page, perPage, debouncedQ, statusFilter, methodFilter],
  );

  const sheet = useApi<AttendanceSheet>(`/activities/${params.id}/attendance/sheet`, query);

  async function record(payload: Record<string, unknown>, memberPreview?: IdentifiedMember) {
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/activities/${params.id}/attendance`, payload);
      toast.success(response.message);
      setIdentified(null);
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
      void previewMember({ member_code: trimmed });
    } else {
      void previewMember({ qr_token: extractTokenFromQr(trimmed) });
    }
  }

  async function previewMember(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      if (payload.member_code) {
        const row = sheet.data?.rows.find((r) => r.member_code === payload.member_code);
        if (row) {
          setIdentified({
            member_code: row.member_code,
            full_name: row.full_name,
            photo_url: row.photo_url,
            province: row.province,
            commune: row.commune,
            structure: row.structure,
            status_label: row.member_status_label,
            card_valid: row.card_valid,
          });
          return;
        }
      }
      const result = await api.post<{ data: VerificationResult }>("/members/verify", payload);
      if (result.data.valid && result.data.member) {
        setIdentified({
          member_code: result.data.member.member_code,
          full_name: result.data.member.full_name,
          photo_url: result.data.member.photo_url,
          status_label: result.data.member.status_label,
          card_valid: result.data.card?.status === "active",
        });
      } else {
        toast.error(result.data.message ?? "Membre non identifié.");
      }
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Identification impossible.");
    } finally {
      setBusy(false);
    }
  }

  function handleFingerprintRecorded(result: FingerprintAttendanceResult) {
    if (!result.valid || !result.member_code || !result.full_name) return;
    setIdentified({
      member_code: result.member_code,
      full_name: result.full_name,
      photo_url: result.photo_url,
      card_valid: true,
    });
    toast.success(result.message);
    sheet.reload();
  }

  function handleBiometric(result: BiometricResult) {
    if (!result.ok || !result.member) return;
    setIdentified({
      member_code: result.member.member_code,
      full_name: result.member.full_name,
      photo_url: result.member.photo_url,
      status_label: result.member.status_label,
      card_valid: true,
    });
    toast.success(result.message);
    sheet.reload();
  }

  function selectRow(row: AttendanceSheet["rows"][number]) {
    setIdentified({
      member_code: row.member_code,
      full_name: row.full_name,
      photo_url: row.photo_url,
      province: row.province ?? undefined,
      commune: row.commune ?? undefined,
      structure: row.structure ?? undefined,
      status_label: row.member_status_label,
      card_valid: row.card_valid,
    });
  }

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadFile(
        `/activities/${params.id}/attendance/sheet/export`,
        undefined,
        `presence-${params.id}.csv`,
      );
      toast.success("Export CSV téléchargé.");
    } catch {
      toast.error("Export impossible.");
    } finally {
      setExporting(false);
    }
  }

  if (sheet.loading && !sheet.data) return <PageLoader />;
  if (sheet.error) return <Alert tone="error">{sheet.error}</Alert>;

  const data = sheet.data!;
  const summary = data.summary;
  const rate = summary.expected
    ? Math.round((summary.present / summary.expected) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/activites", label: "Mobilisation" },
          { href: "/presences", label: "Présences" },
          { href: `/activites/${params.id}`, label: data.activity.title },
          { label: "Feuille de présence" },
        ]}
      />

      <DashboardAnimate>
        <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-[var(--shadow-card)]">
          <div className="grid md:grid-cols-[220px_1fr]">
            <ActivityCoverImage
              url={data.activity.image_url ?? null}
              className="h-full min-h-[140px] w-full md:min-h-[180px]"
            />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Feuille de présence</p>
              <h1 className="text-xl font-semibold text-slate-900">{data.activity.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{data.activity.code}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                <span>{formatDateTime(data.activity.starts_at)}</span>
                {data.activity.location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {data.activity.location}
                  </span>
                ) : null}
                {data.activity.organizer ? <span>Responsable : {data.activity.organizer}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </DashboardAnimate>

      <div className={dashboardCardGrid}>
        <KpiCard label="Participants" value={formatNumber(summary.expected)} icon={UserCheck} />
        <KpiCard label="Présents" value={formatNumber(summary.present)} icon={CheckCircle2} tone="success" />
        <KpiCard label="Absents" value={formatNumber(summary.absent)} icon={UserCheck} tone="danger" />
        <KpiCard label="Taux" value={`${rate} %`} icon={UserCheck} tone="warning" />
      </div>

      <Can permission={PERMISSIONS.attendanceRecord}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Identification en temps réel"
              description="Windows Hello (test), QR, carte membre ou empreinte digitale"
            />
            <CardBody className="space-y-4">
              <Button
                type="button"
                className="w-full"
                size="lg"
                onClick={() => setBiometricOpen(true)}
                disabled={busy}
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
                  <span className="bg-white px-2 text-slate-400">autres méthodes</span>
                </div>
              </div>

              <QrScannerPanel onScan={handleScan} loading={busy} />
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const code = new FormData(e.currentTarget).get("code");
                  if (typeof code === "string" && code.trim()) {
                    void previewMember({ member_code: code.trim() });
                  }
                }}
              >
                <Input name="code" placeholder="ID membre JP-RDC-…" className="flex-1" />
                <Button type="submit" variant="outline" disabled={busy}>
                  <Search className="h-4 w-4" />
                </Button>
              </form>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] font-semibold uppercase tracking-wide">
                  <span className="bg-white px-2 text-slate-400">empreinte digitale (à venir)</span>
                </div>
              </div>

              <FingerprintAttendancePanel
                activityId={Number(params.id)}
                loading={busy}
                onLoadingChange={setBusy}
                onRecorded={handleFingerprintRecorded}
                compact
              />
            </CardBody>
          </Card>

          {identified ? (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader title="✓ Membre identifié" />
              <CardBody className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar src={identified.photo_url} name={identified.full_name} size="lg" />
                  <div>
                    <p className="font-semibold text-slate-900">{identified.full_name}</p>
                    <p className="font-mono text-xs text-slate-500">{identified.member_code}</p>
                    {identified.status_label ? (
                      <div className="mt-1">
                        <MemberStatusBadge status="active" label={identified.status_label} />
                      </div>
                    ) : null}
                  </div>
                </div>
                <dl className="grid gap-2 text-sm text-slate-600">
                  {identified.province ? (
                    <div>
                      <dt className="text-xs text-slate-400">Province</dt>
                      <dd>{identified.province}</dd>
                    </div>
                  ) : null}
                  {identified.commune ? (
                    <div>
                      <dt className="text-xs text-slate-400">Commune</dt>
                      <dd>{identified.commune}</dd>
                    </div>
                  ) : null}
                  {identified.structure ? (
                    <div>
                      <dt className="text-xs text-slate-400">Structure</dt>
                      <dd>{identified.structure}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-slate-400">Carte</dt>
                    <dd>{identified.card_valid ? "Valide" : "Non valide / absente"}</dd>
                  </div>
                </dl>
                <Button
                  className="w-full"
                  onClick={() => record({ member_code: identified.member_code }, identified)}
                  loading={busy}
                >
                  Confirmer la présence
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
                <ScanLine className="mb-2 h-8 w-8 text-slate-300" />
                Identifiez un membre pour confirmer sa présence
              </CardBody>
            </Card>
          )}
        </div>
      </Can>

      <Card>
        <CardHeader
          title="Liste des participants"
          description="Recherche, filtres et pagination"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv} loading={exporting}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Link href={`/activites/${params.id}`}>
                <Button variant="ghost" size="sm">
                  Retour activité
                </Button>
              </Link>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Rechercher un membre…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="min-w-[200px] flex-1"
            />
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous statuts</option>
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="late">En retard</option>
              <option value="excused">Excusé</option>
              <option value="not_recorded">Non pointé</option>
            </Select>
            <Select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Toutes méthodes</option>
              <option value="qr">QR Code</option>
              <option value="fingerprint">Empreinte digitale</option>
              <option value="manual">Manuel</option>
            </Select>
            <Select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </Select>
          </div>

          {sheet.loading ? (
            <TableSkeleton />
          ) : !data.rows.length ? (
            <EmptyState title="Aucun participant" description="Aucun résultat pour ces filtres." />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <AttendanceSheetTable rows={data.rows} onSelect={selectRow} />
              </div>
              {data.meta ? (
                <Pagination
                  page={data.meta.current_page}
                  lastPage={data.meta.last_page}
                  total={data.meta.total}
                  perPage={data.meta.per_page}
                  onChange={setPage}
                  label="membres"
                />
              ) : null}
            </>
          )}
        </CardBody>
      </Card>

      <BiometricModal
        open={biometricOpen}
        onClose={() => setBiometricOpen(false)}
        context="ATTENDANCE"
        activityId={Number(params.id)}
        onSuccess={handleBiometric}
      />
    </div>
  );
}
