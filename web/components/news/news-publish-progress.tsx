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
  preparing: "Préparation…",
  uploading: "Envoi des fichiers…",
  processing: "Enregistrement…",
  done: "Publication réussie !",
  error: "Échec de la publication",
};

/** Barre de progression compacte, affichée sous la carte d'aperçu. */
export function NewsPublishProgress({ open, phase, progress, label }: NewsPublishProgressProps) {
  if (!open || phase === "idle") return null;

  const displayLabel = label ?? PHASE_LABELS[phase];
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)]"
      role="status"
      aria-live="polite"
      aria-label="Progression de la publication"
    >
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-indigo-50 px-4 py-3">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : isError ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs text-red-600">✕</span>
        ) : (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {isDone ? "Terminé" : isError ? "Erreur" : "Publication en cours"}
          </p>
          <p className="truncate text-xs text-slate-500">{displayLabel}</p>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-brand-700">{Math.round(progress)}%</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              isError ? "bg-red-500" : isDone ? "bg-emerald-500" : "bg-gradient-to-r from-brand-500 to-indigo-500",
            )}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        <ul className="space-y-1.5 text-[11px] text-slate-500">
          <StepItem done={progress >= 15} active={phase === "preparing"} label="Validation" />
          <StepItem done={progress >= 85} active={phase === "uploading"} label="Transfert médias" icon={Upload} />
          <StepItem done={progress >= 100 && isDone} active={phase === "processing"} label="Enregistrement" />
        </ul>
      </div>
    </div>
  );
}

function StepItem({
  done,
  active,
  label,
  icon: Icon,
}: {
  done: boolean;
  active: boolean;
  label: string;
  icon?: typeof Upload;
}) {
  return (
    <li className={cn("flex items-center gap-2", done ? "text-emerald-600" : active ? "font-medium text-brand-700" : "")}>
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px]",
          done ? "bg-emerald-100 text-emerald-700" : active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-400",
        )}
      >
        {done ? "✓" : active ? "…" : "○"}
      </span>
      {Icon && active ? <Icon className="h-3 w-3" /> : null}
      {label}
    </li>
  );
}
