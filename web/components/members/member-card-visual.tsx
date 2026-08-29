"use client";

/* eslint-disable @next/next/no-img-element */

import { Logo } from "@/components/brand/logo";
import { CardStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import { useProtectedImage } from "@/lib/hooks";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

function FlagStripe({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-1.5 w-full shrink-0 overflow-hidden", className)} aria-hidden>
      <span className="w-1/3 bg-flag-red" />
      <span className="w-1/3 bg-brand-600" />
      <span className="w-1/3 bg-flag-yellow" />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase sm:text-[9px]">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-[10px] font-bold tracking-wide text-brand-950 uppercase sm:text-[11px]",
          mono && "font-mono tracking-normal normal-case",
        )}
      >
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

function structureLine(render: CardRender) {
  const left = render.commune ?? render.city ?? render.province;
  if (left && render.structure) return `${left} / ${render.structure}`;
  return render.structure ?? left ?? null;
}

function validityLine(render: CardRender) {
  if (!render.issued_at && !render.expires_at) return null;
  return `${formatShortDate(render.issued_at)} – ${formatShortDate(render.expires_at)}`;
}

function isActiveStatus(status: string) {
  const normalized = status.toLowerCase();
  return normalized.includes("actif") || normalized === "active";
}

export function MemberCardVisual({
  render,
  className,
  compact = false,
}: {
  render: CardRender;
  className?: string;
  compact?: boolean;
}) {
  const active = isActiveStatus(render.status);
  const photo = useProtectedImage(render.photo_url);

  return (
    <div
      className={cn(
        "print-area relative flex w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-brand-950 shadow-[var(--shadow-elevated)]",
        "aspect-[1.586/1]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]" aria-hidden>
        <Logo size={compact ? 120 : 160} className="ring-0" />
      </div>

      <header className="relative flex items-center justify-between gap-2 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Logo size={compact ? 28 : 34} className="ring-white/25" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold tracking-[0.06em] text-white uppercase sm:text-xs">
              {render.organization}
            </p>
            <p className="truncate text-[8px] text-white/65 sm:text-[9px]">
              Organisation / plateforme nationale de jeunesse
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[8px] font-bold tracking-wide text-brand-900 uppercase shadow-sm sm:text-[9px]">
          Carte de membre
        </span>
      </header>

      <div className="relative flex min-h-0 flex-1 gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="flex w-[22%] max-w-[5.5rem] shrink-0 flex-col">
          <div className="relative min-h-[4.5rem] flex-1 overflow-hidden rounded-md border border-slate-200 bg-slate-100 shadow-inner">
            {photo ? (
              <img
                src={photo}
                alt={`Photo de ${render.full_name}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 text-sm font-bold text-slate-400">
                {(render.first_name?.[0] ?? "").toUpperCase()}
                {(render.last_name?.[0] ?? "").toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-2 content-start gap-x-3 gap-y-1.5 sm:gap-y-2">
          <Field label="Nom" value={render.last_name} />
          <Field label="Postnom" value={render.middle_name} />
          <Field label="Prénom" value={render.first_name} />
          <Field label="ID membre" value={render.member_code} mono />
          <Field label="Province" value={render.province} />
          <Field label="Structure / cellule" value={structureLine(render)} />
          <div className="min-w-0">
            <p className="text-[8px] font-semibold tracking-[0.14em] text-slate-400 uppercase sm:text-[9px]">Statut</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold tracking-wide text-brand-950 uppercase sm:text-[11px]">
              <span
                className={cn("h-2 w-2 rounded-full", active ? "bg-emerald-500" : "bg-amber-500")}
                aria-hidden
              />
              {render.status}
            </p>
          </div>
          <Field label="Validité" value={validityLine(render)} mono />
        </div>

        <div className="flex w-[26%] max-w-[7rem] shrink-0 flex-col items-center justify-center rounded-md border border-slate-200 bg-white/90 p-1.5 shadow-sm">
          {render.qr_svg ? (
            <img src={render.qr_svg} alt="QR de vérification" className="h-full w-full max-h-[5.5rem] object-contain" />
          ) : (
            <div className="flex h-16 w-full items-center justify-center bg-slate-100 text-[9px] text-slate-400">QR</div>
          )}
          <p className="mt-1 text-center text-[7px] font-medium tracking-wide text-slate-500 uppercase sm:text-[8px]">
            Vérification du membre
          </p>
        </div>
      </div>

      <div className="relative mt-auto border-t border-slate-100 px-3 pt-1.5 pb-0 sm:px-4">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[8px] text-slate-500 sm:text-[9px]">
          <span>Émise le {formatShortDate(render.issued_at)}</span>
          <span>Expire le {formatShortDate(render.expires_at)}</span>
        </div>
        <FlagStripe />
      </div>
    </div>
  );
}

export function CardMeta({
  status,
  statusLabel,
  valid,
}: {
  status?: string | null;
  statusLabel?: string | null;
  valid?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CardStatusBadge status={status} label={statusLabel} />
      {valid !== undefined && (
        <MemberStatusBadge status={valid ? "active" : "suspended"} label={valid ? "Carte valide" : "Carte invalide"} />
      )}
    </div>
  );
}
