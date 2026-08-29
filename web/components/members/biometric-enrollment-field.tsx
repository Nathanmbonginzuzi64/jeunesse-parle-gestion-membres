"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Fingerprint, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import { hasWebAuthnEnrollment, type WebAuthnEnrollmentPayload } from "@/lib/biometrics/types";
import { isWebAuthnAvailable, webAuthnCreate } from "@/lib/biometrics/webauthn-client";
import { cn } from "@/lib/utils";

export function BiometricEnrollmentField({
  value,
  onChange,
  displayName,
  userName,
  error,
  alreadyEnrolled = false,
  subject = "member",
}: {
  value: WebAuthnEnrollmentPayload | null;
  onChange: (payload: WebAuthnEnrollmentPayload | null) => void;
  displayName: string;
  userName: string;
  error?: string | null;
  alreadyEnrolled?: boolean;
  subject?: "member" | "user";
}) {
  const subjectLabel = subject === "user" ? "utilisateur" : "membre";
  const enrollmentKeyRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `enroll-${Date.now()}`,
  );
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const available = USE_MOCKS || isWebAuthnAvailable();
  const enrolled = hasWebAuthnEnrollment(value) || alreadyEnrolled;

  async function enroll() {
    setLocalError(null);
    setBusy(true);

    try {
      if (USE_MOCKS) {
        onChange({
          enrollment_key: enrollmentKeyRef.current,
          clientDataJSON: "mock-client-data",
          attestationObject: "mock-attestation",
          device_name: "Windows Hello (mock)",
          transports: ["internal"],
        });
        return;
      }

      if (!displayName.trim() || !userName.trim()) {
        setLocalError(
          subject === "user"
            ? "Renseignez au minimum le nom et l'e-mail de l'utilisateur avant la biométrie."
            : "Renseignez au minimum le nom et le téléphone du membre avant la biométrie.",
        );
        return;
      }

      const options = await api.public.post<{
        options: { publicKey: Record<string, unknown> };
        enrollment_key: string;
      }>("/biometrics/member-enroll/options", {
        enrollment_key: enrollmentKeyRef.current,
        user_name: userName.trim(),
        display_name: displayName.trim(),
      });

      const attestation = await webAuthnCreate(options.options);

      onChange({
        enrollment_key: options.enrollment_key,
        ...attestation,
        device_name: "Windows Hello",
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setLocalError(
          caught.fieldError("webauthn_enrollment") ??
            caught.fieldError("credential") ??
            caught.message,
        );
      } else if (caught instanceof Error) {
        setLocalError(caught.message);
      } else {
        setLocalError("Enregistrement biométrique impossible.");
      }
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    enrollmentKeyRef.current =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `enroll-${Date.now()}`;
    onChange(null);
    setLocalError(null);
  }

  return (
    <div className="space-y-4">
      {!available && (
        <Alert tone="warning">
          Biométrie indisponible. Utilisez Chrome ou Edge sur localhost avec Windows Hello activé.
        </Alert>
      )}

      <div
        className={cn(
          "rounded-xl border p-6 text-center",
          enrolled
            ? "border-emerald-200 bg-emerald-50"
            : "border-brand-100 bg-gradient-to-br from-brand-50 to-white",
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full",
            enrolled ? "bg-emerald-500 text-white" : "bg-brand-100 text-brand-700",
          )}
        >
          {busy ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : enrolled ? (
            <CheckCircle2 className="h-9 w-9" />
          ) : (
            <Fingerprint className="h-9 w-9" />
          )}
        </div>

        <p className="mt-3 text-sm font-medium text-slate-800">
          {enrolled ? "Biométrie enregistrée" : "Configurer Windows Hello"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {enrolled
            ? `Le credential sera lié à l'${subjectLabel} à la validation du formulaire.`
            : `L'${subjectLabel} pose son doigt sur le lecteur de l'appareil — aucune image n'est stockée.`}
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {!enrolled ? (
            <Button
              type="button"
              size="lg"
              disabled={!available || busy}
              onClick={() => void enroll()}
            >
              <Fingerprint className="h-4 w-4" />
              {busy ? "En cours…" : "Enregistrer l'empreinte"}
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={reset}>
              Reconfigurer
            </Button>
          )}
        </div>
      </div>

      {(localError || error) && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{localError ?? error}</span>
        </div>
      )}
    </div>
  );
}
