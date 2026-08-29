"use client";

/* eslint-disable @next/next/no-img-element */

import { Logo } from "@/components/brand/logo";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

function FlagStripe() {
  return (
    <div className="flex h-1.5 w-full shrink-0 overflow-hidden" aria-hidden>
      <span className="w-1/3 bg-flag-red" />
      <span className="w-1/3 bg-brand-600" />
      <span className="w-1/3 bg-flag-yellow" />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-[9px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{label}</span>
      <span className="max-w-[60%] text-right text-[10px] font-semibold text-brand-950 sm:text-[11px]">
        {value?.trim() || "—"}
      </span>
    </div>
  );
}

export function MemberCardBack({
  render,
  className,
}: {
  render: CardRender;
  className?: string;
}) {
  const structure =
    [render.province, render.commune ?? render.city, render.structure].filter(Boolean).join(" / ") || null;

  return (
    <div
      className={cn(
        "print-area relative flex w-full max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-brand-950 shadow-[var(--shadow-elevated)]",
        "aspect-[1.586/1]",
        className,
      )}
    >
      <header className="relative flex items-center gap-2 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3 py-2 sm:px-4 sm:py-2.5">
        <Logo size={28} className="ring-white/25" />
        <p className="truncate text-[11px] font-bold tracking-[0.06em] text-white uppercase sm:text-xs">
          {render.organization} — RDC
        </p>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col px-3.5 py-2.5 sm:px-4 sm:py-3">
        <h2 className="text-sm font-bold tracking-wide text-brand-800 uppercase sm:text-base">Carte de membre</h2>
        <p className="mt-1 max-w-prose text-[9px] leading-relaxed text-slate-500 sm:text-[10px]">
          Cette carte atteste de l&apos;enregistrement du titulaire dans le système Jeunesse Parle. La validité peut
          être vérifiée via le QR Code. En cas de perte, contactez immédiatement votre structure.
        </p>

        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1">
          <MetaRow label="ID membre" value={render.member_code} />
          <MetaRow label="Date d'émission" value={formatShortDate(render.issued_at)} />
          <MetaRow label="Date d'expiration" value={formatShortDate(render.expires_at)} />
          <MetaRow label="Statut de la carte" value={render.card_status_label || render.status} />
          <MetaRow label="Structure d'appartenance" value={structure} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 h-px w-full max-w-[9rem] bg-slate-300" />
            <p className="text-[8px] tracking-wide text-slate-400 uppercase">Signature du titulaire</p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-brand-700/70 text-center">
            <span className="px-1 text-[7px] font-bold leading-tight tracking-wide text-brand-800 uppercase">
              Cachet
              <br />
              officiel
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-center">
            {render.qr_svg ? (
              <img src={render.qr_svg} alt="" className="h-11 w-11 rounded border border-slate-200 bg-white p-0.5" />
            ) : (
              <div className="h-11 w-11 rounded border border-slate-200 bg-slate-50" />
            )}
            <p className="mt-0.5 text-[7px] text-slate-400 uppercase">QR secondaire</p>
          </div>
        </div>
      </div>

      <div className="relative mt-auto">
        <p className="px-3 pb-1 text-center text-[8px] text-slate-400 sm:px-4">
          www.jeunesseparle.cd · contact@jeunesseparle.cd
        </p>
        <FlagStripe />
      </div>
    </div>
  );
}
