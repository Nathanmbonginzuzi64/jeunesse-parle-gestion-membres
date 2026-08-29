"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Fingerprint, Move } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScannerPhase = "enroll" | "confirm";

export function FingerprintScannerPad({
  phase,
  fingerLabel,
  progress,
  onProgressChange,
  onComplete,
  active,
}: {
  phase: ScannerPhase;
  fingerLabel: string;
  progress: number;
  onProgressChange: (value: number) => void;
  onComplete: () => void;
  active: boolean;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const completedRef = useRef(false);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    completedRef.current = false;
  }, [phase, fingerLabel]);

  useEffect(() => {
    if (progress >= 100 && active && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [progress, active, onComplete]);

  const addProgress = useCallback(
    (amount: number) => {
      if (!active || progress >= 100) return;
      onProgressChange(Math.min(100, progress + amount));
    },
    [active, onProgressChange, progress],
  );

  useEffect(() => {
    if (!active || !pressing) return;

    const tick = window.setInterval(() => addProgress(0.35), 50);
    return () => window.clearInterval(tick);
  }, [active, pressing, addProgress]);

  function trackMovement(clientX: number, clientY: number) {
    if (!active || !pressing) return;
    const point = { x: clientX, y: clientY };
    if (lastPoint.current) {
      const dx = point.x - lastPoint.current.x;
      const dy = point.y - lastPoint.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      addProgress(distance * 0.18);
    }
    lastPoint.current = point;
  }

  function startPress() {
    if (!active) return;
    setPressing(true);
    lastPoint.current = null;
  }

  function stopPress() {
    setPressing(false);
    lastPoint.current = null;
  }

  const phaseTitle = phase === "enroll" ? "Enregistrement en cours" : "Validation du même doigt";
  const phaseHint =
    phase === "enroll"
      ? "Placez le doigt sur le capteur et effectuez de légers mouvements jusqu'à remplissage complet."
      : "Reposez le même doigt et répétez les mouvements pour confirmer l'enregistrement.";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="font-semibold text-slate-900">{phaseTitle}</p>
          <p className="text-xs text-slate-500">{fingerLabel}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold tabular-nums text-brand-700">
          {Math.round(progress)}%
        </span>
      </div>

      <div
        ref={padRef}
        role="application"
        aria-label="Capteur d'empreinte digitale"
        className={cn(
          "relative overflow-hidden rounded-2xl bg-slate-950 select-none touch-none",
          active ? "cursor-crosshair" : "opacity-60",
        )}
        onMouseDown={startPress}
        onMouseUp={stopPress}
        onMouseLeave={stopPress}
        onMouseMove={(e) => trackMovement(e.clientX, e.clientY)}
        onTouchStart={() => startPress()}
        onTouchEnd={stopPress}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) trackMovement(touch.clientX, touch.clientY);
        }}
      >
        <div className="aspect-[4/3] w-full">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.25),transparent_60%)] transition-opacity"
            style={{ opacity: pressing ? 0.9 : 0.3 }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={cn(
                "flex h-36 w-36 items-center justify-center rounded-full border-2 transition-all duration-300",
                progress >= 100
                  ? "border-emerald-400 bg-emerald-500/20"
                  : pressing
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
              className={cn(
                "h-full transition-all duration-150",
                progress >= 100 ? "bg-emerald-500" : "bg-brand-500",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/75">
          <Move className="h-3.5 w-3.5" />
          {pressing ? "Lecture en cours… maintenez et bougez légèrement" : "Maintenez le doigt appuyé sur le capteur"}
        </p>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">{phaseHint}</p>
    </div>
  );
}
