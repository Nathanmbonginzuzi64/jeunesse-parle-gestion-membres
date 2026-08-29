"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, CheckCircle2, Fingerprint } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { FingerprintHandDiagram } from "@/components/members/fingerprint-hand-diagram";
import { FingerprintScannerPad } from "@/components/members/fingerprint-scanner-pad";
import {
  FINGERPRINT_SLOTS,
  REQUIRED_FINGERPRINT_COUNT,
  capturedFingerprintCount,
  generateFingerprintTemplate,
  type FingerprintCaptureMap,
  type FingerprintSlot,
  type MemberFingerprint,
} from "@/lib/fingerprints";
import type { FingerprintSamplePayload } from "@/lib/hooks/use-digitalpersona-reader";
import { cn } from "@/lib/utils";

type WizardStep = "select" | "enroll" | "confirm";

export function FingerprintCaptureField({
  value,
  onChange,
  memberSeed,
  error,
}: {
  value: FingerprintCaptureMap;
  onChange: (next: FingerprintCaptureMap) => void;
  memberSeed: string;
  error?: string | null;
}) {
  const count = capturedFingerprintCount(value);
  const [wizardStep, setWizardStep] = useState<WizardStep>("select");
  const [activeSlot, setActiveSlot] = useState<FingerprintSlot | null>(null);
  const [progress, setProgress] = useState(0);
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [usedHardware, setUsedHardware] = useState(false);
  const [mismatchError, setMismatchError] = useState<string | null>(null);

  const activeMeta = activeSlot ? FINGERPRINT_SLOTS.find((item) => item.slot === activeSlot) : null;
  const seed = memberSeed.trim() || "nouveau-membre";

  function resetWizard() {
    setWizardStep("select");
    setActiveSlot(null);
    setProgress(0);
    setPendingTemplate(null);
    setUsedHardware(false);
    setMismatchError(null);
  }

  function selectFinger(slot: FingerprintSlot) {
    if (value[slot]) return;
    setActiveSlot(slot);
    setWizardStep("enroll");
    setProgress(0);
    setPendingTemplate(null);
    setUsedHardware(false);
    setMismatchError(null);
  }

  const finalizeFinger = useCallback(
    (template: string) => {
      if (!activeSlot) return;
      const meta = FINGERPRINT_SLOTS.find((item) => item.slot === activeSlot)!;
      const captured: MemberFingerprint = {
        slot: activeSlot,
        hand: meta.hand,
        finger: meta.finger,
        template_hash: template,
        captured_at: new Date().toISOString(),
      };
      onChange({ ...value, [activeSlot]: captured });
      resetWizard();
    },
    [activeSlot, onChange, value],
  );

  const handleHardwareSample = useCallback(
    (payload: FingerprintSamplePayload) => {
      if (wizardStep === "enroll") {
        setPendingTemplate(payload.templateHash);
        setUsedHardware(true);
      }
    },
    [wizardStep],
  );

  const handleEnrollComplete = useCallback(() => {
    if (!activeSlot) return;
    setPendingTemplate((prev) => prev ?? generateFingerprintTemplate(seed, activeSlot));
    setProgress(0);
    setWizardStep("confirm");
    setMismatchError(null);
  }, [activeSlot, seed]);

  const handleConfirmComplete = useCallback(() => {
    if (!activeSlot || !pendingTemplate) return;

    if (usedHardware) {
      finalizeFinger(pendingTemplate);
      return;
    }

    const confirmTemplate = generateFingerprintTemplate(seed, activeSlot);
    if (confirmTemplate !== pendingTemplate) {
      setMismatchError("Les empreintes ne correspondent pas. Recommencez l'enregistrement de ce doigt.");
      setProgress(0);
      setWizardStep("enroll");
      setPendingTemplate(null);
      return;
    }

    finalizeFinger(pendingTemplate);
  }, [activeSlot, finalizeFinger, pendingTemplate, seed, usedHardware]);

  return (
    <Field
      label="Procédure d'enregistrement biométrique"
      hint="Choisissez un doigt, scannez avec le lecteur HID (ou simulation), puis validez avec le même doigt."
      error={error}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Progression globale</span>
          <span
            className={cn(
              "font-semibold tabular-nums",
              count === REQUIRED_FINGERPRINT_COUNT ? "text-emerald-700" : "text-brand-700",
            )}
          >
            {count} / {REQUIRED_FINGERPRINT_COUNT} doigts validés
          </span>
        </div>

        {wizardStep === "select" && (
          <>
            <Alert tone="info" title="Étape 1 — Choisir le doigt de départ">
              Sélectionnez le doigt à enregistrer sur la main gauche ou droite (auriculaire, index ou majeur).
            </Alert>
            <FingerprintHandDiagram value={value} activeSlot={activeSlot} onSelectFinger={selectFinger} />
          </>
        )}

        {(wizardStep === "enroll" || wizardStep === "confirm") && activeMeta && (
          <div className="space-y-4 rounded-2xl border border-brand-200 bg-brand-50/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Fingerprint className="h-4 w-4 text-brand-600" />
                <span className="font-medium text-slate-900">
                  {wizardStep === "enroll" ? "Étape 2 — Enregistrement" : "Étape 3 — Validation"}
                </span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={resetWizard}>
                <ArrowLeft className="h-4 w-4" />
                Changer de doigt
              </Button>
            </div>

            <FingerprintHandDiagram
              value={value}
              activeSlot={activeSlot}
              onSelectFinger={selectFinger}
              selectionEnabled={false}
            />

            <FingerprintScannerPad
              phase={wizardStep === "enroll" ? "enroll" : "confirm"}
              fingerLabel={activeMeta.label}
              progress={progress}
              onProgressChange={setProgress}
              onComplete={wizardStep === "enroll" ? handleEnrollComplete : handleConfirmComplete}
              onHardwareSample={handleHardwareSample}
              active
            />

            {mismatchError && <Alert tone="error">{mismatchError}</Alert>}

            {wizardStep === "confirm" && (
              <Alert tone="warning" title="Validation obligatoire">
                Reposez exactement le même doigt ({activeMeta.label}) pour confirmer l&apos;enregistrement.
              </Alert>
            )}
          </div>
        )}

        {count === REQUIRED_FINGERPRINT_COUNT && wizardStep === "select" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Les 6 empreintes sont enregistrées et validées. Vous pouvez continuer.
          </div>
        )}

        {count > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(Object.fromEntries(FINGERPRINT_SLOTS.map((item) => [item.slot, null])) as FingerprintCaptureMap);
              resetWizard();
            }}
          >
            Tout effacer et recommencer la procédure
          </Button>
        )}
      </div>
    </Field>
  );
}
