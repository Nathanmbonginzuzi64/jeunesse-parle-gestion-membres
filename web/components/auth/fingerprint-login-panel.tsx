"use client";

import { useState } from "react";
import { CheckCircle2, Fingerprint, Loader2, XCircle } from "lucide-react";
import { FingerprintScannerPad } from "@/components/members/fingerprint-scanner-pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { generateFingerprintTemplate } from "@/lib/fingerprints";
import type { AuthUser } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FingerprintLoginResponse {
  valid: boolean;
  message: string;
  token?: string;
  user?: AuthUser;
}

export function FingerprintLoginPanel({
  onSuccess,
  loading,
  onLoadingChange,
}: {
  onSuccess: (user: AuthUser, token: string) => void;
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [login, setLogin] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FingerprintLoginResponse | null>(null);
  const [hardwareHash, setHardwareHash] = useState<string | null>(null);

  async function submitSample(templateHash: string, format: "hardware" | "simulation") {
    const identifier = login.trim();
    if (!identifier) {
      setError("Saisissez votre e-mail ou numéro de téléphone.");
      return;
    }

    setScanning(true);
    setError(null);
    setResult(null);
    onLoadingChange?.(true);

    try {
      const response = await api.public.post<FingerprintLoginResponse>("/auth/login-fingerprint", {
        login: identifier,
        template_hash: templateHash,
        format,
      });
      setResult(response);
      if (response.valid && response.token && response.user) {
        onSuccess(response.user, response.token);
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        const payload = caught.payload as unknown as FingerprintLoginResponse;
        setResult(payload ?? null);
        setError(caught.message);
      } else {
        setError("Connexion biométrique impossible.");
      }
    } finally {
      setScanning(false);
      onLoadingChange?.(false);
      setProgress(0);
      setHardwareHash(null);
    }
  }

  async function handleScanComplete() {
    const identifier = login.trim();
    if (!identifier) {
      setError("Saisissez votre e-mail ou numéro de téléphone.");
      return;
    }

    if (hardwareHash) {
      await submitSample(hardwareHash, "hardware");
      return;
    }

    const simulated = generateFingerprintTemplate(`login-${identifier.toLowerCase()}`, "left_index");
    await submitSample(simulated, "simulation");
  }

  const busy = scanning || loading;
  const canScan = Boolean(login.trim()) && !busy;

  return (
    <div className="space-y-4">
      <Input
        label="E-mail ou téléphone"
        type="text"
        autoComplete="username"
        value={login}
        onChange={(e) => setLogin(e.target.value)}
        placeholder="nom@exemple.cd ou +243 …"
        hint="Identifiez votre compte, puis scannez une empreinte enregistrée."
        required
      />

      <div className="rounded-xl border border-brand-200/60 bg-gradient-to-br from-brand-50 to-white p-4">
        {canScan ? (
          <FingerprintScannerPad
            phase="enroll"
            fingerLabel="Doigt enregistré"
            progress={progress}
            onProgressChange={setProgress}
            onComplete={() => void handleScanComplete()}
            onHardwareSample={(payload) => setHardwareHash(payload.templateHash)}
            active={!busy}
          />
        ) : (
          <div className="py-6 text-center">
            <div className={cn("mx-auto flex h-20 w-20 items-center justify-center rounded-full", scanning ? "bg-brand-100 animate-pulse" : "bg-brand-50")}>
              {scanning ? <Loader2 className="h-9 w-9 animate-spin text-brand-600" /> : <Fingerprint className="h-9 w-9 text-brand-600" />}
            </div>
            <p className="mt-3 text-sm font-medium text-slate-800">
              {scanning ? "Vérification serveur…" : "Saisissez d'abord votre identifiant"}
            </p>
          </div>
        )}
        <p className="mt-2 text-center text-xs text-slate-500">
          Le serveur valide l&apos;empreinte — le navigateur ne fait que la capture.
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {result && !result.valid && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      {result?.valid && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={busy}
        disabled={!login.trim()}
        onClick={() => void handleScanComplete()}
      >
        <Fingerprint className="h-4 w-4" />
        Se connecter par empreinte
      </Button>
    </div>
  );
}
