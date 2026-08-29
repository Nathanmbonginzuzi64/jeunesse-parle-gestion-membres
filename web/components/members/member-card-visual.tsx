"use client";

/* eslint-disable @next/next/no-img-element */

import { Logo } from "@/components/brand/logo";
import { MemberQrCode } from "@/components/cards/member-qr-code";
import { CardStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import { useProtectedImage } from "@/lib/hooks";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

function FlagStripe({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[5px] w-full shrink-0 overflow-hidden", className)} aria-hidden>
      <span className="w-1/3 bg-flag-red" />
      <span className="w-1/3 bg-brand-600" />
      <span className="w-1/3 bg-flag-yellow" />
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[9px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[12px] font-bold leading-snug text-brand-950",
          mono ? "font-mono text-[11px] tracking-tight" : "uppercase tracking-wide",
        )}
        title={value ?? undefined}
      >
        <span className="line-clamp-2 break-words">{value?.trim() || "—"}</span>
      </p>
    </div>
  );
}

function structureLine(render: CardRender) {
  const left = render.commune ?? render.city;
  if (left && render.structure) return `${left} / ${render.structure}`;
  return render.structure ?? left ?? render.province ?? null;
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
  const qrValue = render.verification_url || render.member_code;

  return (
    <div
      className={cn(
        "print-area relative flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-brand-950 shadow-[var(--shadow-elevated)]",
        "aspect-[1.586/1]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]" aria-hidden>
        <Logo size={compact ? 110 : 150} className="ring-0" />
      </div>

      <header className="relative flex items-center justify-between gap-3 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo size={compact ? 30 : 36} className="ring-white/25" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold tracking-[0.08em] text-white uppercase sm:text-[13px]">
              {render.organization}
            </p>
            <p className="truncate text-[9px] text-white/70">Organisation / plateforme nationale de jeunesse</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[9px] font-bold tracking-wide text-brand-900 uppercase shadow-sm">
          Carte de membre
        </span>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto] sm:gap-3.5 sm:px-4 sm:py-3.5">
        {/* Photo — hauteur réduite */}
        <div className="relative h-[4.75rem] w-full self-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner sm:h-[5.25rem]">
          {photo ? (
            <img
              src={photo}
              alt={`Photo de ${render.full_name}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-slate-50 to-slate-200">
              <span className="text-base font-bold tracking-wide text-slate-400">
                {(render.first_name?.[0] ?? "").toUpperCase()}
                {(render.last_name?.[0] ?? "").toUpperCase()}
              </span>
              <span className="text-[7px] font-medium tracking-wide text-slate-400 uppercase">Photo</span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="grid min-w-0 content-center gap-y-2.5 sm:gap-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <Field label="Nom" value={render.last_name} />
            <Field label="Postnom" value={render.middle_name} />
            <Field label="Prénom" value={render.first_name} />
            <Field label="ID membre" value={render.member_code} mono />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-slate-100 pt-2.5">
            <Field label="Province" value={render.province} />
            <Field label="Structure / cellule" value={structureLine(render)} />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold tracking-[0.12em] text-slate-400 uppercase">Statut</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[12px] font-bold tracking-wide text-brand-950 uppercase">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full ring-2 ring-offset-1",
                    active ? "bg-emerald-500 ring-emerald-100" : "bg-amber-500 ring-amber-100",
                  )}
                  aria-hidden
                />
                {render.status}
              </p>
            </div>
            <Field label="Validité" value={validityLine(render)} mono />
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center justify-center self-center rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1.5 shadow-sm">
          <MemberQrCode value={qrValue} size={compact ? 72 : 88} label="Vérification du membre" />
        </div>
      </div>

      <div className="relative mt-auto border-t border-slate-100 bg-white/80 px-3.5 pt-1.5 sm:px-4">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[9px] font-medium text-slate-500">
          <span>
            Émise le <span className="text-slate-700">{formatShortDate(render.issued_at)}</span>
          </span>
          <span>
            Expire le <span className="text-slate-700">{formatShortDate(render.expires_at)}</span>
          </span>
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
