"use client";

/* eslint-disable @next/next/no-img-element */

import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { CardStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

export function MemberCardVisual({
  render,
  className,
}: {
  render: CardRender;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "print-area relative overflow-hidden rounded-2xl bg-brand-950 text-white shadow-xl",
        "aspect-[1.586/1] w-full max-w-[28rem]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-brand-600/40 blur-2xl" />
      <div className="pointer-events-none absolute right-0 bottom-8 left-0 h-8 origin-left -rotate-[18deg] bg-flag-red/90" />
      <div className="pointer-events-none absolute right-0 bottom-6 left-0 h-1.5 origin-left -rotate-[18deg] bg-flag-yellow" />

      <div className="relative flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <div>
              <p className="text-[10px] tracking-[0.18em] text-white/60 uppercase">{render.country}</p>
              <p className="text-sm font-semibold">{render.organization}</p>
            </div>
          </div>
          <p className="text-[10px] font-medium tracking-wider text-gold-400 uppercase">Carte de membre</p>
        </div>

        <div className="mt-4 flex flex-1 items-center gap-4">
          <Avatar src={render.photo_url} name={render.full_name} size="lg" rounded="lg" className="ring-2 ring-white/20" />
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight font-semibold">{render.full_name}</p>
            <p className="mt-1 font-mono text-xs tracking-wider text-gold-400">{render.member_code}</p>
            <p className="mt-2 truncate text-xs text-white/70">{render.structure ?? "—"}</p>
            <p className="truncate text-[11px] text-white/50">{render.province ?? "—"}</p>
          </div>
          {render.qr_svg && (
            <div className="ml-auto hidden shrink-0 rounded-lg bg-white p-1.5 sm:block">
              <img src={render.qr_svg} alt="QR de vérification" className="h-20 w-20" />
            </div>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3 text-[10px] text-white/70">
          <div>
            <p>Émise le {formatShortDate(render.issued_at)}</p>
            {render.expires_at && <p>Expire le {formatShortDate(render.expires_at)}</p>}
          </div>
          <p className="font-medium text-white">{render.status}</p>
        </div>
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
