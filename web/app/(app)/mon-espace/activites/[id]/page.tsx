"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

type ActivityDetail = {
  id: number;
  title: string;
  code?: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  status?: string;
  status_label?: string;
  type_label?: string;
  is_registered?: boolean;
  can_check_in?: boolean;
  fingerprint_enrolled?: boolean;
  attendance?: {
    id: number;
    status?: string;
    status_label?: string;
    method?: string;
    recorded_at?: string | null;
  } | null;
  qr?: {
    token?: string;
    verification_url?: string | null;
    qr_svg?: string | null;
  } | null;
  structure?: { name?: string } | null;
  organizer?: { name?: string } | null;
};

export default function MemberActivityDetailPage() {
  const params = useParams<{ id: string }>();
  const { member } = useAuth();
  const toast = useToast();
  const [item, setItem] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id || !member) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: ActivityDetail }>(
        `/activities/${params.id}/for-member`,
      );
      setItem(response.data);
    } catch (err) {
      setItem(null);
      setError(err instanceof ApiError ? err.message : "Activité introuvable.");
    } finally {
      setLoading(false);
    }
  }, [params.id, member]);

  useEffect(() => {
    void load();
  }, [load]);

  async function register() {
    if (!item) return;
    setBusy(true);
    try {
      await api.post(`/activities/${item.id}/register`);
      toast.success("Inscription enregistrée.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function checkInWithQr(scannedToken?: string) {
    if (!item) return;
    setBusy(true);
    try {
      const payload: { method: "qr"; qr_token?: string } = { method: "qr" };
      if (scannedToken?.trim()) {
        payload.qr_token = scannedToken.trim();
      }
      const response = await api.post<{ message?: string }>(
        `/activities/${item.id}/attendance/self`,
        payload,
      );
      toast.success(response.message ?? "Présence confirmée via votre QR.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Pointage impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (!member) {
    return (
      <Alert tone="info">
        Ce compte n&apos;est pas rattaché à un dossier membre.
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="space-y-4">
        <Link href="/mon-espace/activites" className="inline-flex items-center gap-2 text-sm text-brand-700">
          <ArrowLeft className="h-4 w-4" /> Retour aux activités
        </Link>
        <Alert tone="danger">{error ?? "Activité introuvable."}</Alert>
      </div>
    );
  }

  const alreadyPresent = item.attendance?.status === "present";

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.title}
        description={[item.type_label, item.code].filter(Boolean).join(" · ")}
        actions={
          <Link href="/mon-espace/activites">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Activités
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader title="Détails" />
          <CardBody className="space-y-3 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              Début : {formatDateTime(item.starts_at) || "—"}
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              Fin : {formatDateTime(item.ends_at) || "—"}
            </p>
            {item.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                {item.location}
              </p>
            ) : null}
            {item.structure?.name ? <p>Structure : {item.structure.name}</p> : null}
            {item.organizer?.name ? <p>Organisateur : {item.organizer.name}</p> : null}
            {item.description ? (
              <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-slate-700">
                {item.description}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Badge tone={item.is_registered ? "success" : "neutral"}>
                {item.is_registered ? "Inscrit" : "Non inscrit"}
              </Badge>
              <Badge tone="neutral">{item.status_label ?? item.status ?? "—"}</Badge>
              {alreadyPresent ? <Badge tone="success">Présence confirmée</Badge> : null}
            </div>

            <div className="flex flex-wrap gap-2 pt-3">
              {!item.is_registered ? (
                <Button loading={busy} onClick={() => void register()}>
                  S&apos;inscrire
                </Button>
              ) : null}
              {item.can_check_in ? (
                <Button loading={busy} onClick={() => void checkInWithQr()}>
                  <ShieldCheck className="h-4 w-4" />
                  Confirmer ma présence (QR carte)
                </Button>
              ) : null}
              {alreadyPresent ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Présent
                  {item.attendance?.recorded_at
                    ? ` · ${formatDateTime(item.attendance.recorded_at)}`
                    : ""}
                </p>
              ) : null}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Présence via QR"
            description="Présentez ce QR à un agent, ou scannez-le pour pointer vous-même."
          />
          <CardBody className="flex flex-col items-center gap-4">
            {item.qr?.qr_svg ? (
              <>
                {/* qr_svg est une data-URI PNG/SVG générée par le backend */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.qr.qr_svg}
                  alt="QR de présence"
                  className="h-52 w-52 rounded-2xl border border-slate-200 bg-white p-3 object-contain"
                />
                <p className="text-center text-xs text-slate-500">
                  Carte {member.member_code} · à présenter à l&apos;agent de vérification
                </p>
                <Link href="/ma-carte">
                  <Button variant="outline" size="sm">
                    <QrCode className="h-4 w-4" />
                    Voir ma carte
                  </Button>
                </Link>
              </>
            ) : (
              <Alert tone="info">
                Aucun QR actif sur votre carte. Ouvrez « Ma carte » ou contactez un responsable.
              </Alert>
            )}

            {item.can_check_in ? (
              <div className="w-full space-y-2 border-t border-slate-100 pt-4">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <ScanLine className="h-4 w-4 text-brand-600" />
                  Scanner mon QR pour pointer
                </p>
                <p className="text-xs text-slate-500">
                  Pointez la caméra sur le QR de votre carte (ou saisissez le jeton).
                </p>
                <QrScannerPanel
                  onScan={(value) => void checkInWithQr(value)}
                  loading={busy}
                  placeholder="Jeton QR ou URL de vérification"
                />
              </div>
            ) : null}

            {!item.is_registered && !alreadyPresent ? (
              <Alert tone="info">
                Inscrivez-vous d&apos;abord pour pouvoir confirmer votre présence.
              </Alert>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
