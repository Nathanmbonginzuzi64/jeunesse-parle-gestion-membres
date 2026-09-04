"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CreditCard,
  Fingerprint,
  IdCard,
  LayoutGrid,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { QuickLinkCard } from "@/components/dashboard/quick-link-card";
import { BiometricModal, type BiometricResult } from "@/components/biometrics/biometric-modal";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { RequirePermission } from "@/components/auth/require-permission";
import {
  VerificationHero,
  VerificationHistory,
  ServerVerificationHistory,
  type VerificationHistoryEntry,
} from "@/components/verification/verification-history";
import { VerificationResultPanel } from "@/components/verification/verification-result-panel";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { StatisticsOverview, VerificationResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type VerifyMode = "qr" | "fingerprint";

export default function VerificationPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsVerify}>
      <VerificationTool />
    </RequirePermission>
  );
}

function VerificationTool() {
  const { can } = useAuth();
  const stats = useApi<StatisticsOverview>(
    can(PERMISSIONS.statisticsView) ? "/statistics" : null,
  );
  const [mode, setMode] = useState<VerifyMode>("qr");
  const [loading, setLoading] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VerificationHistoryEntry[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [lastQrToken, setLastQrToken] = useState<string | null>(null);

  async function verify(tokenSource: string) {
    const token = extractTokenFromQr(tokenSource);
    const normalized = token.trim();
    const isMemberCode = /^JP-RDC-/i.test(normalized);
    if (!normalized || (!isMemberCode && normalized.length < 16)) {
      setError("Identifiant ou jeton QR invalide.");
      setResult(null);
      setLastQrToken(null);
      return;
    }

    setLoading(true);
    setError(null);
    setLastQrToken(normalized);

    try {
      const response = await api.post<VerificationResult>("/members/verify", { token: normalized });
      setResult(response);
      pushHistory(response);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const payload = caught.payload as unknown as VerificationResult;
        setResult(payload ?? null);
        setError(caught.message);
        if (payload) pushHistory(payload);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
        setResult(null);
      }
    } finally {
      setLoading(false);
    }
  }

  function pushHistory(entry: VerificationResult) {
    setHistory((prev) => [
      { id: crypto.randomUUID(), scannedAt: new Date(), result: entry },
      ...prev.slice(0, 9),
    ]);
    setHistoryTick((tick) => tick + 1);
  }

  function handleBiometricSuccess(fpResult: BiometricResult) {
    if (!fpResult.member) return;

    const valid =
      typeof fpResult.valid === "boolean"
        ? fpResult.valid
        : fpResult.ok && fpResult.member.status === "active";
    const outcome = (fpResult.result as VerificationResult["result"]) ?? (valid ? "valid" : "inactive");

    const synthetic: VerificationResult = {
      result: outcome,
      valid,
      message: fpResult.message,
      member: {
        member_id: fpResult.member.id,
        member_code: fpResult.member.member_code,
        full_name: fpResult.member.full_name,
        photo_url: fpResult.member.photo_url ?? null,
        gender: null,
        province: fpResult.member.province ?? null,
        city: fpResult.member.city ?? null,
        structure: fpResult.member.structure ?? null,
        position: fpResult.member.position ?? null,
        status: fpResult.member.status_label,
        card_number: fpResult.member.card?.card_number ?? "",
        card_status: fpResult.member.card?.status_label ?? "",
        issued_at: fpResult.member.card?.issued_at ?? null,
        expires_at: fpResult.member.card?.expires_at ?? null,
        phone: fpResult.member.phone ?? null,
        fingerprint_enrolled: true,
        fingerprints_count: 1,
      },
    };
    setResult(synthetic);
    setError(valid ? null : fpResult.message);
    setLastQrToken(null);
    pushHistory(synthetic);
    setBiometricOpen(false);
  }

  function clearResult() {
    setResult(null);
    setError(null);
    setLastQrToken(null);
  }

  function startNewVerification() {
    clearResult();
    setMode("qr");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const kpis = stats.data?.kpis;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/membres", label: "Membres" },
          { label: "Vérification" },
        ]}
      />

      <DashboardAnimate>
        <VerificationHero sessionCount={history.length} />
      </DashboardAnimate>

      {kpis && (
        <DashboardAnimate delay={60}>
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
            <KpiCard
              label="Vérifications (30 j)"
              value={kpis.verifications.last_30_days}
              icon={ScanLine}
              tone="info"
              hint="période glissante"
            />
            <KpiCard
              label="Cartes actives"
              value={kpis.cards.active}
              icon={BadgeCheck}
              tone="success"
              href="/cartes?status=active"
            />
            <KpiCard
              label="Membres actifs"
              value={kpis.members.active}
              icon={ShieldCheck}
              tone="info"
              href="/membres?status=active"
            />
            <KpiCard
              label="Cartes émises (mois)"
              value={kpis.cards.issued_this_month}
              icon={CreditCard}
              tone="neutral"
              href="/cartes"
            />
          </div>
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={80}>
        <nav className="flex flex-wrap gap-2 rounded-card border border-slate-200/80 bg-white p-1.5 shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => setMode("qr")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              mode === "qr" ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-brand-50",
            )}
          >
            <QrCode className="h-4 w-4" />
            QR / Code membre
          </button>
          <button
            type="button"
            onClick={() => setMode("fingerprint")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              mode === "fingerprint"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-50",
            )}
          >
            <Fingerprint className="h-4 w-4" />
            Empreinte digitale
          </button>
        </nav>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {mode === "qr" ? (
            <Card className="overflow-hidden">
              <CardHeader
                title="Scanner ou saisir"
                description="QR code de la carte ou identifiant JP-RDC-XXXXXXXX"
              />
              <CardBody>
                <QrScannerPanel onScan={(value) => void verify(value)} loading={loading} />
              </CardBody>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardHeader
                title="Identifier le membre"
                description="Windows Hello — le membre pose son doigt. Aucune session n'est créée."
              />
              <CardBody className="space-y-4 text-center">
                <Fingerprint className="mx-auto h-14 w-14 text-brand-600" />
                <p className="text-sm text-slate-600">
                  Identification biométrique du membre pour vérifier sa carte (statut, validité).
                </p>
                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  onClick={() => setBiometricOpen(true)}
                  disabled={loading}
                >
                  <Fingerprint className="h-4 w-4" />
                  Lancer la vérification biométrique
                </Button>
              </CardBody>
            </Card>
          )}

          <VerificationResultPanel
            result={result}
            error={error}
            loading={loading}
            qrToken={lastQrToken}
            onClear={clearResult}
          />
        </div>
      </DashboardAnimate>

      <BiometricModal
        open={biometricOpen}
        onClose={() => setBiometricOpen(false)}
        context="MEMBER_VERIFICATION"
        onSuccess={handleBiometricSuccess}
      />

      {history.length > 0 && (
        <DashboardAnimate delay={140}>
          <VerificationHistory entries={history} />
        </DashboardAnimate>
      )}

      <DashboardAnimate delay={160}>
        <ServerVerificationHistory
          key={historyTick}
          onNewVerification={startNewVerification}
        />
      </DashboardAnimate>

      <DashboardAnimate delay={180}>
        <DashboardSection
          icon={QrCode}
          title="Raccourcis"
          description="Actions liées à la vérification et aux cartes"
          tone="emerald"
        >
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
            <QuickLinkCard
              href="/scan"
              icon={ScanLine}
              title="Scan de présence"
              description="Enregistrer la participation à une activité"
              tone="emerald"
            />
            <QuickLinkCard
              href="/cartes/galerie"
              icon={LayoutGrid}
              title="Galerie des cartes"
              description="Aperçu visuel de toutes les cartes émises"
              tone="brand"
            />
            <QuickLinkCard
              href="/cartes"
              icon={IdCard}
              title="Registre cartes"
              description="Gestion, renouvellement et révocation"
              tone="brand"
            />
            <QuickLinkCard
              href="/membres?status=pending"
              icon={BadgeCheck}
              title="Dossiers en attente"
              description="Valider les membres avant émission"
              tone="amber"
            />
          </div>
        </DashboardSection>
      </DashboardAnimate>
    </div>
  );
}
