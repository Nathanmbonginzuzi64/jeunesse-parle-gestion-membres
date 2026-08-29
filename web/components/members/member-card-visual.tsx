"use client";

/* eslint-disable @next/next/no-img-element */

import { BadgeCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MemberQrCode } from "@/components/cards/member-qr-code";
import { CardStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import { useProtectedImage } from "@/lib/hooks";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

function FlagStripe({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[4px] w-full shrink-0 overflow-hidden", className)} aria-hidden>
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
      <p className="text-[8px] font-semibold tracking-[0.1em] text-slate-400 uppercase">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[11px] font-bold leading-snug text-brand-950",
          mono ? "font-mono text-[10px] tracking-tight" : "uppercase tracking-wide",
        )}
        title={value ?? undefined}
      >
        <span className="line-clamp-1 break-words">{value?.trim() || "—"}</span>
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

function isCertifiedCard(render: CardRender) {
  return render.card_status === "active" && isActiveStatus(render.status ?? "");
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
  const active = isActiveStatus(render?.status ?? "");
  const certified = isCertifiedCard(render);
  const photo = useProtectedImage(render?.photo_url);
  const qrValue = render?.verification_url || render?.member_code;

  if (!render) {
    return null;
  }

  return (
    <div
      className={cn(
        "print-area relative flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-brand-950 shadow-[var(--shadow-elevated)]",
        "aspect-[1.586/1]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045]" aria-hidden>
        <Logo size={compact ? 90 : 120} className="ring-0" />
      </div>

      <header className="relative flex shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Logo size={compact ? 28 : 32} className="ring-white/25" />
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold tracking-[0.06em] text-white uppercase">
              {render.organization}
            </p>
            <p className="truncate text-[8px] text-white/70">Organisation / plateforme nationale de jeunesse</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[8px] font-bold tracking-wide text-brand-900 uppercase shadow-sm">
          Carte de membre
        </span>
      </header>

      <div className="relative grid min-h-0 flex-1 grid-cols-[4.25rem_minmax(0,1fr)_auto] items-stretch gap-2.5 px-3.5 py-2.5 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-3">
        {/* Photo */}
        <div className="relative h-full min-h-[4rem] max-h-[4.75rem] w-full self-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-inner sm:max-h-[5rem]">
          {photo ? (
            <img
              src={photo}
              alt={`Photo de ${render.full_name}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-gradient-to-b from-slate-50 to-slate-200">
              <span className="text-sm font-bold tracking-wide text-slate-400">
                {(render.first_name?.[0] ?? "").toUpperCase()}
                {(render.last_name?.[0] ?? "").toUpperCase()}
              </span>
              <span className="text-[7px] font-medium tracking-wide text-slate-400 uppercase">Photo</span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="grid min-w-0 content-center gap-y-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <p
              className="min-w-0 flex-1 truncate text-[12px] font-bold leading-none tracking-wide text-brand-950 uppercase"
              title={render.full_name}
            >
              {render.full_name}
            </p>
            {certified && (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-brand-600 px-1.5 py-px text-[7px] font-bold tracking-[0.05em] text-white uppercase shadow-sm ring-1 ring-brand-500/30"
                title="Carte certifiée"
              >
                <BadgeCheck className="h-2 w-2 shrink-0" aria-hidden />
                Certifié
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            <Field label="Nom" value={render.last_name} />
            <Field label="Postnom" value={render.middle_name} />
            <Field label="Prénom" value={render.first_name} />
            <Field label="ID membre" value={render.member_code} mono />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2">
            <Field label="Province" value={render.province} />
            <Field label="Structure / cellule" value={structureLine(render)} />
            <div className="min-w-0">
              <p className="text-[8px] font-semibold tracking-[0.1em] text-slate-400 uppercase">Statut</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-brand-950 uppercase">
                <span
                  className={cn(
                    "inline-block h-2 w-2 shrink-0 rounded-full ring-1 ring-offset-1",
                    active ? "bg-emerald-500 ring-emerald-100" : "bg-amber-500 ring-amber-100",
                  )}
                  aria-hidden
                />
                <span className="truncate">{render.status}</span>
              </p>
            </div>
            <Field label="Validité" value={validityLine(render)} mono />
          </div>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center justify-center self-center rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1.5 shadow-sm">
          <MemberQrCode value={qrValue} size={compact ? 62 : 76} label="Vérification du membre" />
        </div>
      </div>

      <div className="relative mt-auto shrink-0 border-t border-slate-100 bg-white/80 px-3.5 pt-1.5">
        <div className="mb-1 flex items-center justify-between gap-2 text-[8px] font-medium text-slate-500">
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
