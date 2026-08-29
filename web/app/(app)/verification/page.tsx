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
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { RequirePermission } from "@/components/auth/require-permission";
import { FingerprintVerifyPanel } from "@/components/verification/fingerprint-verify-panel";
import {
  VerificationHero,
  VerificationHistory,
  type VerificationHistoryEntry,
} from "@/components/verification/verification-history";
import { VerificationResultPanel } from "@/components/verification/verification-result-panel";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import type { FingerprintVerifyResult } from "@/lib/fingerprints";
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
  const stats = useApi<StatisticsOverview>("/statistics");
  const [mode, setMode] = useState<VerifyMode>("qr");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VerificationHistoryEntry[]>([]);

  async function verify(tokenSource: string) {
    const token = extractTokenFromQr(tokenSource);
    if (!token.toUpperCase().startsWith("JP-RDC-") && token.length < 16) {
      setError("Identifiant ou jeton QR invalide.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.public.post<VerificationResult>("/members/verify", { token });
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
  }

  function handleFingerprintVerified(fpResult: FingerprintVerifyResult) {
    if (!fpResult.valid) return;
    const synthetic: VerificationResult = {
      result: "valid",
      valid: true,
      message: `${fpResult.message} (biométrie)`,
      member: {
        member_id: fpResult.member_id ?? undefined,
        member_code: fpResult.member_code ?? "",
        full_name: fpResult.full_name ?? "",
        photo_url: null,
        gender: null,
        province: null,
        structure: null,
        position: null,
        status: "Actif",
        card_number: "",
        card_status: "",
        issued_at: null,
        expires_at: null,
        fingerprint_enrolled: true,
        fingerprints_count: fpResult.fingerprints_enrolled,
      },
    };
    setResult(synthetic);
    setError(null);
    pushHistory(synthetic);
  }

  function clearResult() {
    setResult(null);
    setError(null);
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
            <FingerprintVerifyPanel
              loading={loading}
              onLoadingChange={setLoading}
              onVerified={handleFingerprintVerified}
            />
          )}

          <VerificationResultPanel
            result={result}
            error={error}
            loading={loading}
            onClear={clearResult}
          />
        </div>
      </DashboardAnimate>

      {history.length > 0 && (
        <DashboardAnimate delay={140}>
          <VerificationHistory entries={history} />
        </DashboardAnimate>
      )}

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
