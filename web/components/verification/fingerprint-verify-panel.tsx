"use client";

import { useState } from "react";
import { CheckCircle2, Fingerprint, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import {
  FINGERPRINT_SLOTS,
  type FingerprintVerifyResult,
} from "@/lib/fingerprints";
import { cn } from "@/lib/utils";

export function FingerprintVerifyPanel({
  loading,
  onLoadingChange,
  onVerified,
}: {
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onVerified?: (result: FingerprintVerifyResult) => void;
}) {
  const [memberCode, setMemberCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<FingerprintVerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function verifyFingerprint() {
    const code = memberCode.trim().toUpperCase();
    if (!code.startsWith("JP-RDC-")) {
      setError("Saisissez un identifiant membre valide (ex. JP-RDC-00000001).");
      setResult(null);
      return;
    }

    setScanning(true);
    setError(null);
    onLoadingChange?.(true);

    await new Promise((resolve) => setTimeout(resolve, 1600));

    try {
      const response = await api.public.post<FingerprintVerifyResult>("/members/verify-fingerprint", {
        member_code: code,
      });
      setResult(response);
      onVerified?.(response);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const payload = caught.payload as unknown as FingerprintVerifyResult;
        setResult(payload ?? null);
        setError(caught.message);
        if (payload) onVerified?.(payload);
      } else {
        setError("Impossible de vérifier l'empreinte.");
        setResult(null);
      }
    } finally {
      setScanning(false);
      onLoadingChange?.(false);
    }
  }

  const busy = scanning || loading;

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Vérification par empreinte"
        description="Auriculaire, index et majeur — mains gauche et droite"
      />
      <CardBody className="space-y-4">
        <Input
          label="Identifiant membre"
          placeholder="JP-RDC-00000001"
          value={memberCode}
          onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
          hint="Saisissez le code membre avant de scanner l'empreinte."
        />

        <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
          <div className="mx-auto flex max-w-xs flex-col items-center gap-3 text-center">
            <span
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full ring-4",
                result?.valid
                  ? "bg-emerald-500 text-white ring-emerald-200"
                  : scanning
                    ? "bg-brand-600 text-white ring-brand-200 animate-pulse"
                    : "bg-slate-200 text-slate-500 ring-slate-100",
              )}
            >
              {scanning ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : result?.valid ? (
                <CheckCircle2 className="h-10 w-10" />
              ) : (
                <Fingerprint className="h-10 w-10" />
              )}
            </span>
            <p className="text-sm text-slate-600">
              {scanning
                ? "Lecture biométrique en cours…"
                : "Placez un doigt enregistré (auriculaire, index ou majeur) sur le capteur"}
            </p>
            <Button
              type="button"
              className="w-full"
              onClick={() => void verifyFingerprint()}
              loading={busy}
              disabled={!memberCode.trim()}
            >
              <Fingerprint className="h-4 w-4" />
              Scanner l&apos;empreinte
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 sm:grid-cols-3">
          {FINGERPRINT_SLOTS.map((slot) => (
            <span key={slot.slot} className="rounded-md bg-slate-50 px-2 py-1 text-center ring-1 ring-slate-100">
              {slot.shortLabel}
            </span>
          ))}
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {result && (
          <Alert tone={result.valid ? "success" : "warning"}>
            <span className="inline-flex items-center gap-2">
              {result.valid ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {result.message}
            </span>
            {result.full_name && (
              <p className="mt-1 text-xs opacity-90">
                {result.full_name} · {result.member_code}
                {result.matched_slot && ` · doigt : ${FINGERPRINT_SLOTS.find((s) => s.slot === result.matched_slot)?.label}`}
              </p>
            )}
            {!result.valid && result.fingerprints_enrolled > 0 && (
              <p className="mt-1 text-xs opacity-90">
                {result.fingerprints_enrolled} empreinte(s) enregistrée(s) pour ce membre.
              </p>
            )}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
