"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Fingerprint, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError, getToken } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import {
  BIOMETRIC_CONTEXT_COPY,
  type BiometricContext,
} from "@/lib/biometrics/contexts";
import { useWebAuthnCeremony } from "@/lib/biometrics/use-webauthn-ceremony";
import { isWebAuthnAvailable } from "@/lib/biometrics/webauthn-client";
import type { AuthUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export type BiometricResult = {
  ok: boolean;
  context: BiometricContext;
  action?: string;
  message: string;
  creates_session?: boolean;
  token?: string;
  user?: AuthUser;
  member?: {
    id: number;
    member_code: string;
    full_name: string;
    status: string;
    status_label: string;
    photo_url?: string | null;
    structure?: string | null;
    province?: string | null;
    city?: string | null;
    position?: string | null;
    phone?: string | null;
    card?: {
      status: string;
      status_label: string;
      card_number?: string;
      issued_at?: string | null;
      expires_at?: string | null;
    } | null;
  };
  attendance?: { id: number; recorded_at: string | null; method: string };
};

type ChallengeResponse = {
  options: { publicKey: Record<string, unknown> };
  challenge_key: string;
  context: BiometricContext;
};

export function BiometricModal({
  open,
  onClose,
  context,
  activityId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  context: BiometricContext;
  activityId?: number;
  onSuccess?: (result: BiometricResult) => void;
}) {
  const copy = BIOMETRIC_CONTEXT_COPY[context];
  const [phase, setPhase] = useState<"idle" | "waiting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BiometricResult | null>(null);
  const { awaitingCeremony, clearPending, runCreate, runGet, formatError } = useWebAuthnCeremony();
  const challengeRef = useRef<ChallengeResponse | null>(null);

  const available = USE_MOCKS || isWebAuthnAvailable();
  const needsAuth = context === "ATTENDANCE" || context === "BIOMETRIC_REGISTRATION" || context === "SECURITY_CONFIRMATION";

  async function postJson<T>(path: string, body: unknown, authenticated: boolean): Promise<T> {
    if (authenticated) return api.post<T>(path, body);
    return api.public.post<T>(path, body);
  }

  async function run() {
    setMessage(null);
    setResult(null);

    if (!available) {
      setPhase("error");
      setMessage("Votre appareil ne dispose pas d'un moyen d'authentification biométrique compatible.");
      return;
    }

    if (needsAuth && !getToken()) {
      setPhase("error");
      setMessage("Vous devez être connecté pour cette action biométrique.");
      return;
    }

    setPhase("waiting");

    try {
      // Mode design : simule le résultat sans ceremony WebAuthn (API mock).
      if (USE_MOCKS) {
        if (context === "BIOMETRIC_REGISTRATION") {
          const registered = await api.post<{ message?: string }>("/biometrics/register", {
            device_name: "Windows Hello (mock)",
          });
          const payload: BiometricResult = {
            ok: true,
            context,
            message: registered.message || copy.successDefault,
          };
          setResult(payload);
          setPhase("success");
          onSuccess?.(payload);
          return;
        }

        const authResult = await postJson<BiometricResult>(
          "/biometrics/authenticate",
          { context, challenge_key: "mock", activity_id: activityId },
          needsAuth || Boolean(getToken()),
        );
        setResult(authResult);
        setPhase("success");
        onSuccess?.(authResult);
        return;
      }

      if (context === "BIOMETRIC_REGISTRATION") {
        const attestation = await runCreate(async () => {
          const options = await api.post<{ options: { publicKey: Record<string, unknown> } }>(
            "/biometrics/register/options",
          );
          return options.options;
        });
        const registered = await api.post<{ message?: string }>("/biometrics/register", {
          ...attestation,
          device_name: "Windows Hello",
        });
        const payload: BiometricResult = {
          ok: true,
          context,
          message: registered.message || copy.successDefault,
        };
        setResult(payload);
        setPhase("success");
        onSuccess?.(payload);
        challengeRef.current = null;
        return;
      }

      let challengePayload = challengeRef.current;
      if (!awaitingCeremony || !challengePayload) {
        challengePayload = await postJson<ChallengeResponse>(
          "/biometrics/authenticate/options",
          {
            context,
            ...(context === "ATTENDANCE" && activityId ? { activity_id: activityId } : {}),
          },
          needsAuth,
        );
        challengeRef.current = challengePayload;
      }

      const assertion = await runGet(async () => challengePayload!.options);
      const authResult = await postJson<BiometricResult>(
        "/biometrics/authenticate",
        {
          context,
          challenge_key: challengePayload.challenge_key,
          activity_id: activityId,
          ...assertion,
        },
        needsAuth || Boolean(getToken()),
      );

      setResult(authResult);
      setPhase("success");
      onSuccess?.(authResult);
      challengeRef.current = null;
    } catch (caught) {
      setPhase("error");
      if (caught instanceof ApiError) {
        setMessage(
          caught.fieldError("credential") ??
            caught.fieldError("context") ??
            caught.fieldError("activity_id") ??
            Object.values(caught.errors)[0]?.[0] ??
            caught.message,
        );
        clearPending();
      } else {
        setMessage(formatError(caught));
      }
    }
  }

  function handleClose() {
    clearPending();
    challengeRef.current = null;
    setPhase("idle");
    setMessage(null);
    setResult(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={copy.title} description={copy.description} size="sm">
      <div className="space-y-4 text-center">
        {!available && (
          <Alert tone="warning">
            Biométrie indisponible. Utilisez le mot de passe, le QR ou l&apos;identifiant membre.
          </Alert>
        )}

        {awaitingCeremony && phase !== "success" && (
          <Alert tone="info">
            Gardez cette fenêtre active, puis cliquez à nouveau sur le bouton pour lancer Windows Hello.
          </Alert>
        )}

        <div
          className={cn(
            "mx-auto flex h-24 w-24 items-center justify-center rounded-full ring-4",
            phase === "success"
              ? "bg-emerald-500 text-white ring-emerald-200"
              : phase === "error"
                ? "bg-red-500 text-white ring-red-200"
                : phase === "waiting"
                  ? "bg-brand-600 text-white ring-brand-200 animate-pulse"
                  : "bg-brand-50 text-brand-700 ring-brand-100",
          )}
        >
          {phase === "waiting" ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : phase === "success" ? (
            <CheckCircle2 className="h-10 w-10" />
          ) : phase === "error" ? (
            <XCircle className="h-10 w-10" />
          ) : (
            <Fingerprint className="h-10 w-10" />
          )}
        </div>

        <p className="text-sm text-slate-600">
          {phase === "waiting"
            ? copy.waiting
            : phase === "success"
              ? result?.message || copy.successDefault
              : phase === "error"
                ? message
                : "Appuyez pour lancer Windows Hello."}
        </p>

        {phase === "success" && result?.member && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-900">
            <p className="font-semibold">{result.member.full_name}</p>
            <p className="text-xs opacity-90">{result.member.member_code}</p>
            <p className="mt-1 text-xs">
              {result.member.status_label}
              {result.member.card ? ` · Carte ${result.member.card.status_label}` : ""}
            </p>
            {result.attendance?.recorded_at && (
              <p className="mt-1 text-xs">
                Présence à{" "}
                {new Date(result.attendance.recorded_at).toLocaleTimeString("fr-CD", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {phase === "error" && message && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {phase !== "success" && (
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => void run()}
              disabled={!available || phase === "waiting"}
            >
              <Fingerprint className="h-4 w-4" />
              {phase === "waiting" ? "En cours…" : awaitingCeremony ? "Lancer Windows Hello" : "Utiliser mon empreinte"}
            </Button>
          )}
          <Button type="button" variant="outline" className="w-full" onClick={handleClose}>
            {phase === "success" ? "Fermer" : "Annuler"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
