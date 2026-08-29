"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/topbar";
import { QrScannerPanel } from "@/components/members/qr-scanner-panel";
import { RequirePermission } from "@/components/auth/require-permission";
import { PublicAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { DefinitionList } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { extractTokenFromQr } from "@/lib/form";
import { PERMISSIONS } from "@/lib/permissions";
import type { VerificationResult } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

export default function VerificationPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsVerify}>
      <VerificationTool />
    </RequirePermission>
  );
}

function VerificationTool() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verify(tokenSource: string) {
    const token = extractTokenFromQr(tokenSource);
    if (!token.toUpperCase().startsWith("JP-RDC-") && token.length < 16) {
      setError("Identifiant ou jeton QR invalide.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.public.post<VerificationResult>("/members/verify", { token });
      setResult(response);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setResult((caught.payload as unknown as VerificationResult) ?? null);
        setError(caught.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  }

  const member = result?.member;
  const valid = result?.valid === true;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/membres", label: "Membres" }, { label: "Vérification" }]} />
      <PageHeader
        title="Vérifier une carte"
        description="Scannez le QR code ou saisissez l'identifiant membre. Une carte désactivée est immédiatement rejetée."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <QrScannerPanel onScan={(value) => void verify(value)} loading={loading} />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            {error && !member && <Alert tone="error">{error}</Alert>}
            {!result && !error && (
              <p className="text-sm text-slate-500">En attente d&apos;un scan ou d&apos;une saisie.</p>
            )}
            {result && (
              <div className="space-y-4">
                <Alert tone={valid ? "success" : "error"}>{result.message}</Alert>
                {member && (
                  <>
                    <div className="flex items-center gap-3">
                      <PublicAvatar src={member.photo_url} name={member.full_name} />
                      <div>
                        <p className="font-semibold">{member.full_name}</p>
                        <p className="font-mono text-xs text-brand-700">{member.member_code}</p>
                        <div className="mt-1 flex gap-1.5">
                          <Badge tone={valid ? "success" : "danger"}>{member.status}</Badge>
                          <Badge>{member.card_status}</Badge>
                        </div>
                      </div>
                    </div>
                    <DefinitionList
                      columns={1}
                      items={[
                        { label: "Structure", value: member.structure },
                        { label: "Province", value: member.province },
                        { label: "Carte", value: member.card_status },
                        { label: "Émission", value: formatShortDate(member.issued_at) },
                        { label: "Téléphone", value: member.phone },
                      ]}
                    />
                  </>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
