"use client";

import { useState } from "react";
import { CheckCircle2, Fingerprint, Loader2, XCircle } from "lucide-react";
import { FingerprintScannerPad } from "@/components/members/fingerprint-scanner-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import {
  FINGERPRINT_SLOTS,
  generateFingerprintTemplate,
  type FingerprintSlot,
} from "@/lib/fingerprints";
import { cn } from "@/lib/utils";

export interface FingerprintAttendanceResult {
  valid: boolean;
  message: string;
  attendance_recorded: boolean;
  matched_slot?: FingerprintSlot | null;
  member_code?: string | null;
  member_id?: number | null;
  full_name?: string | null;
  photo_url?: string | null;
}

export function FingerprintAttendancePanel({
  activityId,
  loading,
  onLoadingChange,
  onRecorded,
  compact = false,
}: {
  activityId: number;
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  onRecorded?: (result: FingerprintAttendanceResult) => void;
  compact?: boolean;
}) {
  const [memberCode, setMemberCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<FingerprintAttendanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hardwareHash, setHardwareHash] = useState<string | null>(null);

  async function submitSample(templateHash: string, format: "hardware" | "simulation") {
    const code = memberCode.trim().toUpperCase();

    setScanning(true);
    setError(null);
    setResult(null);
    onLoadingChange?.(true);

    try {
      const response = await api.post<FingerprintAttendanceResult>(
        `/activities/${activityId}/attendance/fingerprint`,
        {
          ...(code ? { member_code: code } : {}),
          template_hash: templateHash,
          format,
        },
      );
      setResult(response);
      if (response.valid && response.attendance_recorded) {
        onRecorded?.(response);
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        const payload = caught.payload as unknown as FingerprintAttendanceResult;
        setResult(payload ?? null);
        setError(caught.message);
      } else {
        setError("Pointage par empreinte impossible.");
        setResult(null);
      }
    } finally {
      setScanning(false);
      onLoadingChange?.(false);
      setProgress(0);
      setHardwareHash(null);
    }
  }

  async function verifyFingerprint() {
    const code = memberCode.trim().toUpperCase();

    if (hardwareHash) {
      await submitSample(hardwareHash, "hardware");
      return;
    }

    if (code.startsWith("JP-RDC-")) {
      await submitSample(generateFingerprintTemplate(code, "left_index"), "simulation");
      return;
    }

    if (!code) {
      setError("Sans code membre, utilisez le lecteur d'empreinte connecté.");
      return;
    }

    setError("Code membre invalide (ex. JP-RDC-00000001) ou utilisez le lecteur hardware.");
  }

  const busy = scanning || loading;
  const canScan = !busy;

  return (
    <div className={cn("space-y-3", compact ? "" : "rounded-xl border border-brand-100 bg-brand-50/30 p-4")}>
      {!compact && (
        <div>
          <p className="text-sm font-semibold text-slate-900">Empreinte digitale</p>
          <p className="text-xs text-slate-500">
            Posez le doigt sur le lecteur — la présence est enregistrée automatiquement si reconnue.
          </p>
        </div>
      )}

      <Input
        label={compact ? undefined : "Code membre (optionnel)"}
        placeholder="JP-RDC-00000001 — optionnel avec lecteur"
        value={memberCode}
        onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
        hint="Accélère l'identification en mode simulation ou si plusieurs empreintes similaires."
      />

      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
        {canScan ? (
          <FingerprintScannerPad
            phase="enroll"
            fingerLabel="Doigt enregistré"
            progress={progress}
            onProgressChange={setProgress}
            onComplete={() => void verifyFingerprint()}
            onHardwareSample={(payload) => setHardwareHash(payload.templateHash)}
            active={!busy}
          />
        ) : (
          <div className="mx-auto flex max-w-xs flex-col items-center gap-3 py-4 text-center">
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
              {scanning ? "Vérification et enregistrement…" : "Prêt pour le scan d'empreinte"}
            </p>
          </div>
        )}

        <Button
          type="button"
          className="mt-3 w-full"
          onClick={() => void verifyFingerprint()}
          loading={busy}
        >
          <Fingerprint className="h-4 w-4" />
          Scanner et enregistrer la présence
        </Button>
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
              {result.matched_slot &&
                ` · doigt : ${FINGERPRINT_SLOTS.find((s) => s.slot === result.matched_slot)?.label ?? result.matched_slot}`}
            </p>
          )}
        </Alert>
      )}
    </div>
  );
}
