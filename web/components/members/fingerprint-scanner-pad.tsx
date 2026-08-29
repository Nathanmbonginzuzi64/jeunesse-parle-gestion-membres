"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Cpu, Fingerprint, Move } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import {
  DIGITALPERSONA_LITE_CLIENT_URL,
  DigitalPersonaScripts,
} from "@/components/fingerprint/digitalpersona-scripts";
import {
  useDigitalPersonaReader,
  type FingerprintSamplePayload,
} from "@/lib/hooks/use-digitalpersona-reader";
import { cn } from "@/lib/utils";

export type ScannerPhase = "enroll" | "confirm";

export function FingerprintScannerPad({
  phase,
  fingerLabel,
  progress,
  onProgressChange,
  onComplete,
  onHardwareSample,
  active,
}: {
  phase: ScannerPhase;
  fingerLabel: string;
  progress: number;
  onProgressChange: (value: number) => void;
  onComplete: () => void;
  onHardwareSample?: (payload: FingerprintSamplePayload) => void;
  active: boolean;
}) {
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);
  const [pressing, setPressing] = useState(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);

  const handleHardwareSample = useCallback(
    (payload: FingerprintSamplePayload) => {
      onHardwareSample?.(payload);
      onProgressChange(100);
    },
    [onHardwareSample, onProgressChange],
  );

  const reader = useDigitalPersonaReader({
    active,
    onSample: handleHardwareSample,
    onQualityProgress: (value) => onProgressChange(Math.max(progress, value)),
    onError: (message) => setHardwareError(message),
  });

  const useSimulation = reader.state === "unavailable" || reader.state === "error";

  useEffect(() => {
    completedRef.current = false;
    setHardwareError(null);
  }, [phase, fingerLabel]);

  useEffect(() => {
    if (progress >= 100 && active && !completedRef.current) {
      completedRef.current = true;
      if (useSimulation) {
        onComplete();
      } else if (onHardwareSample) {
        onComplete();
      }
    }
  }, [progress, active, onComplete, onHardwareSample, useSimulation]);

  const addProgress = useCallback(
    (amount: number) => {
      if (!active || !useSimulation || progress >= 100) return;
      onProgressChange(Math.min(100, progress + amount));
    },
    [active, onProgressChange, progress, useSimulation],
  );

  useEffect(() => {
    if (!active || !useSimulation || !pressing) return;
    const tick = window.setInterval(() => addProgress(0.35), 50);
    return () => window.clearInterval(tick);
  }, [active, pressing, addProgress, useSimulation]);

  function trackMovement(clientX: number, clientY: number) {
    if (!active || !useSimulation || !pressing) return;
    const point = { x: clientX, y: clientY };
    if (lastPoint.current) {
      const dx = point.x - lastPoint.current.x;
      const dy = point.y - lastPoint.current.y;
      addProgress(Math.sqrt(dx * dx + dy * dy) * 0.18);
    }
    lastPoint.current = point;
  }

  const phaseTitle = phase === "enroll" ? "Enregistrement en cours" : "Validation du même doigt";
  const phaseHint = useSimulation
    ? phase === "enroll"
      ? "Mode simulation : maintenez et bougez légèrement sur le capteur virtuel."
      : "Reposez le même doigt et répétez les mouvements pour confirmer."
    : phase === "enroll"
      ? "Placez le doigt sur le lecteur HID — capture en temps réel."
      : "Reposez le même doigt sur le lecteur pour valider l'enregistrement.";

  const statusLabel =
    reader.state === "loading"
      ? "Connexion au lecteur…"
      : reader.state === "capturing"
        ? "Lecture biométrique en cours…"
        : useSimulation
          ? "Lecteur physique absent — simulation active"
          : "Lecteur HID connecté";

  return (
    <>
      <DigitalPersonaScripts />
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-semibold text-slate-900">{phaseTitle}</p>
            <p className="text-xs text-slate-500">{fingerLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {!useSimulation && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                <Cpu className="h-3 w-3" />
                HID DigitalPersona
              </span>
            )}
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold tabular-nums text-brand-700">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div
          role="application"
          aria-label="Capteur d'empreinte digitale"
          className={cn(
            "relative overflow-hidden rounded-2xl bg-slate-950 select-none",
            useSimulation ? "cursor-crosshair touch-none" : "cursor-default",
            active ? "" : "opacity-60",
          )}
          onMouseDown={() => useSimulation && setPressing(true)}
          onMouseUp={() => setPressing(false)}
          onMouseLeave={() => setPressing(false)}
          onMouseMove={(e) => trackMovement(e.clientX, e.clientY)}
          onTouchStart={() => useSimulation && setPressing(true)}
          onTouchEnd={() => setPressing(false)}
          onTouchMove={(e) => {
            const touch = e.touches[0];
            if (touch) trackMovement(touch.clientX, touch.clientY);
          }}
        >
          <div className="aspect-[4/3] w-full">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.25),transparent_60%)] transition-opacity"
              style={{ opacity: pressing || reader.state === "capturing" ? 0.9 : 0.3 }}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  "flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all duration-300",
                  progress >= 100
                    ? "border-emerald-400 bg-emerald-500/20"
                    : pressing || reader.state === "capturing"
                      ? "border-brand-400 bg-brand-500/15 animate-pulse"
                      : "border-gold-400/80 bg-white/5",
                )}
              >
                <Fingerprint
                  className={cn(
                    "h-16 w-16 transition-colors",
                    progress >= 100 ? "text-emerald-400" : pressing ? "text-brand-300" : "text-white/70",
                  )}
                />
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-slate-800">
              <div
                className={cn("h-full transition-all duration-150", progress >= 100 ? "bg-emerald-500" : "bg-brand-500")}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/75">
            {useSimulation && <Move className="h-3.5 w-3.5" />}
            {statusLabel}
          </p>
        </div>

        <p className="text-xs leading-relaxed text-slate-500">{phaseHint}</p>

        {hardwareError && (
          <Alert tone="warning">
            {hardwareError}.{" "}
            <a
              href={DIGITALPERSONA_LITE_CLIENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-700 underline"
            >
              Télécharger HID Authentication Device Client
            </a>
          </Alert>
        )}
      </div>
    </>
  );
}
