"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export type PublishPhase = "idle" | "preparing" | "uploading" | "processing" | "done" | "error";

interface NewsPublishProgressProps {
  open: boolean;
  phase: PublishPhase;
  progress: number;
  label?: string;
}

const PHASE_LABELS: Record<PublishPhase, string> = {
  idle: "",
  preparing: "Préparation de la publication…",
  uploading: "Envoi des fichiers en cours…",
  processing: "Traitement par le serveur…",
  done: "Publication réussie !",
  error: "Échec de la publication",
};

export function NewsPublishProgress({ open, phase, progress, label }: NewsPublishProgressProps) {
  if (!open || phase === "idle") return null;

  const displayLabel = label ?? PHASE_LABELS[phase];
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        role="dialog"
        aria-live="polite"
        aria-label="Progression de la publication"
      >
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            {isDone ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-300" />
            ) : isError ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/30 text-lg">✕</span>
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-brand-200" />
            )}
            <div>
              <p className="font-semibold">{isDone ? "Terminé" : isError ? "Erreur" : "Publication en cours"}</p>
              <p className="text-sm text-brand-100">{displayLabel}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-600">
              {!isDone && !isError ? <Upload className="h-4 w-4" /> : null}
              Progression
            </span>
            <span className="font-bold tabular-nums text-brand-700">{Math.round(progress)}%</span>
          </div>

          <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                isError ? "bg-red-500" : isDone ? "bg-emerald-500" : "bg-gradient-to-r from-brand-500 to-indigo-500",
              )}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>

          <ul className="mt-4 space-y-2 text-xs text-slate-500">
            <StepItem done={progress >= 15} active={phase === "preparing"} label="Validation du contenu" />
            <StepItem done={progress >= 85} active={phase === "uploading"} label="Transfert des médias" />
            <StepItem done={progress >= 100 && isDone} active={phase === "processing"} label="Enregistrement & notification" />
          </ul>
        </div>
      </div>
    </div>
  );
}

function StepItem({ done, active, label }: { done: boolean; active: boolean; label: string }) {
  return (
    <li className={cn("flex items-center gap-2", done ? "text-emerald-600" : active ? "font-medium text-brand-700" : "")}>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
          done ? "bg-emerald-100 text-emerald-700" : active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400",
        )}
      >
        {done ? "✓" : active ? "…" : "○"}
      </span>
      {label}
    </li>
  );
}
