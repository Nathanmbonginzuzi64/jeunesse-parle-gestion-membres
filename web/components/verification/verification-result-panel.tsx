"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Fingerprint,
  IdCard,
  ShieldAlert,
  ShieldOff,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { PublicAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { DefinitionList } from "@/components/ui/table";
import type { VerificationResult } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";
import { MemberQrCode } from "@/components/cards/member-qr-code";

const RESULT_META: Record<
  VerificationResult["result"],
  { tone: "success" | "warning" | "danger"; icon: LucideIcon; label: string }
> = {
  valid: { tone: "success", icon: CheckCircle2, label: "Carte valide" },
  inactive: { tone: "warning", icon: ShieldAlert, label: "Inactive" },
  expired: { tone: "warning", icon: Clock, label: "Expirée" },
  revoked: { tone: "danger", icon: ShieldOff, label: "Révoquée" },
  not_found: { tone: "danger", icon: XCircle, label: "Introuvable" },
};

const PANEL_STYLES = {
  success: "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white",
  warning: "border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white",
  danger: "border-red-200/80 bg-gradient-to-br from-red-50/80 to-white",
  idle: "border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white",
};

export function VerificationResultPanel({
  result,
  error,
  loading,
  qrToken,
  onClear,
}: {
  result: VerificationResult | null;
  error: string | null;
  loading?: boolean;
  qrToken?: string | null;
  onClear?: () => void;
}) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader title="Résultat" description="Vérification en cours…" />
        <CardBody className="space-y-4">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </CardBody>
      </Card>
    );
  }

  if (!result && !error) {
    return (
      <Card className={cn("h-full border-dashed", PANEL_STYLES.idle)}>
        <CardBody className="flex min-h-[22rem] flex-col items-center justify-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <BadgeCheck className="h-8 w-8" aria-hidden />
          </span>
          <div className="max-w-xs space-y-1">
            <p className="font-semibold text-slate-900">En attente de scan</p>
            <p className="text-sm text-slate-500">
              Scannez un QR code ou saisissez l&apos;identifiant membre pour afficher le résultat ici.
            </p>
          </div>
          <div className="mt-2 grid w-full max-w-sm gap-2 text-left text-xs text-slate-500">
            <p className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 ring-1 ring-slate-100">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">1</span>
              Activez la caméra ou saisissez le code
            </p>
            <p className="flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 ring-1 ring-slate-100">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">2</span>
              Le statut membre et carte s&apos;affiche instantanément
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const meta = result ? RESULT_META[result.result] : RESULT_META.not_found;
  const Icon = meta.icon;
  const member = result?.member;
  const panelTone = result?.valid ? "success" : result ? (meta.tone === "warning" ? "warning" : "danger") : "danger";

  return (
    <Card className={cn("h-full overflow-hidden", PANEL_STYLES[panelTone])}>
      <CardHeader
        title="Résultat de vérification"
        description={result?.message ?? error ?? undefined}
        action={
          (result || error) && onClear ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Effacer
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-5">
        {error && !member && <Alert tone="error">{error}</Alert>}

        {result && (
          <>
            <div
              className={cn(
                "flex items-center gap-4 rounded-xl p-4 ring-1 ring-inset",
                panelTone === "success" && "bg-emerald-100/50 ring-emerald-200/60",
                panelTone === "warning" && "bg-amber-100/50 ring-amber-200/60",
                panelTone === "danger" && "bg-red-100/50 ring-red-200/60",
              )}
            >
              <span
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                  panelTone === "success" && "bg-emerald-500 text-white",
                  panelTone === "warning" && "bg-amber-500 text-white",
                  panelTone === "danger" && "bg-red-500 text-white",
                )}
              >
                <Icon className="h-7 w-7" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900">{meta.label}</p>
                <p className="text-sm text-slate-600">{result.message}</p>
              </div>
            </div>

            {member && (
              <>
                <div className="grid gap-4 lg:grid-cols-[1fr_10rem]">
                  <div className="flex items-center gap-4 rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm">
                  <PublicAvatar src={member.photo_url} name={member.full_name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold text-slate-900">{member.full_name}</p>
                    <p className="font-mono text-xs text-brand-700">{member.member_code}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={result.valid ? "success" : "warning"}>{member.status}</Badge>
                      <Badge tone={result.valid ? "success" : "danger"}>{member.card_status || "—"}</Badge>
                      {member.fingerprint_enrolled && (
                        <Badge tone="info" className="gap-1">
                          <Fingerprint className="h-3 w-3" />
                          Biométrie OK
                        </Badge>
                      )}
                    </div>
                  </div>
                  </div>

                  {qrToken ? (
                    <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
                      <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        QR de revalidation
                      </p>
                      <div className="mt-2 flex justify-center">
                        <MemberQrCode value={`/verifier-membre/${qrToken}`} size={96} compact label="" />
                      </div>
                      <p className="mt-1 text-center text-[10px] text-slate-500">
                        {result.valid ? "Valider à nouveau" : "Contrôle rapide"}
                      </p>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>

                <DefinitionList
                  columns={2}
                  items={[
                    { label: "Structure", value: member.structure ?? "—" },
                    { label: "Province", value: member.province ?? "—" },
                    { label: "Fonction", value: member.position ?? "—" },
                    { label: "N° carte", value: member.card_number ?? "—" },
                    { label: "Émission", value: formatShortDate(member.issued_at) },
                    { label: "Expiration", value: formatShortDate(member.expires_at) },
                    { label: "Téléphone", value: member.phone ?? "—" },
                    { label: "Ville", value: member.city ?? "—" },
                    {
                      label: "Empreintes",
                      value: member.fingerprint_enrolled
                        ? `${member.fingerprints_count ?? 6} doigt(s) enregistré(s)`
                        : "Non enregistrées",
                    },
                  ]}
                />

                {member.member_id && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-200/60 pt-4">
                    <Link href={`/membres/${member.member_id}`}>
                      <Button variant="outline" size="sm">
                        <User className="h-4 w-4" />
                        Fiche membre
                      </Button>
                    </Link>
                    <Link href={`/cartes/apercu/${member.member_id}`}>
                      <Button variant="outline" size="sm">
                        <IdCard className="h-4 w-4" />
                        Voir la carte
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
