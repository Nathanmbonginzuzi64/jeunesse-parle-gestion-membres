"use client";

import { Logo } from "@/components/brand/logo";
import { MemberQrCode } from "@/components/cards/member-qr-code";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

function FlagStripe() {
  return (
    <div className="flex h-[5px] w-full shrink-0 overflow-hidden" aria-hidden>
      <span className="w-1/3 bg-flag-red" />
      <span className="w-1/3 bg-brand-600" />
      <span className="w-1/3 bg-flag-yellow" />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <span className="text-[9px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{label}</span>
      <span className="truncate text-right text-[12px] font-semibold text-brand-950" title={value ?? undefined}>
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
  const qrValue = render.verification_url || render.member_code;

  return (
    <div
      className={cn(
        "print-area relative flex w-full max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-brand-950 shadow-[var(--shadow-elevated)]",
        "aspect-[1.586/1]",
        className,
      )}
    >
      <header className="relative flex items-center gap-2.5 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3.5 py-2.5 sm:px-4">
        <Logo size={30} className="ring-white/25" />
        <p className="truncate text-xs font-bold tracking-[0.08em] text-white uppercase sm:text-[13px]">
          {render.organization} — RDC
        </p>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col px-4 py-3">
        <h2 className="text-[15px] font-bold tracking-wide text-brand-800 uppercase">Carte de membre</h2>
        <p className="mt-1.5 max-w-prose text-[10px] leading-relaxed text-slate-500">
          Cette carte atteste de l&apos;enregistrement du titulaire dans le système Jeunesse Parle. La validité peut
          être vérifiée via le QR Code. En cas de perte, contactez immédiatement votre structure.
        </p>

        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-1">
          <MetaRow label="ID membre" value={render.member_code} />
          <MetaRow label="Date d'émission" value={formatShortDate(render.issued_at)} />
          <MetaRow label="Date d'expiration" value={formatShortDate(render.expires_at)} />
          <MetaRow label="Statut de la carte" value={render.card_status_label || render.status} />
          <MetaRow label="Structure d'appartenance" value={structure} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-3">
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="mb-1.5 h-px w-full max-w-[10rem] bg-slate-300" />
            <p className="text-[9px] tracking-wide text-slate-400 uppercase">Signature du titulaire</p>
          </div>

          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-brand-700/80 text-center shadow-sm">
            <span className="px-1 text-[8px] font-bold leading-tight tracking-wide text-brand-800 uppercase">
              Cachet
              <br />
              officiel
            </span>
          </div>

          <MemberQrCode value={qrValue} size={52} label="QR secondaire" compact className="shrink-0" />
        </div>
      </div>

      <div className="relative mt-auto">
        <p className="px-4 pb-1.5 text-center text-[9px] text-slate-400">
          www.jeunesseparle.cd · contact@jeunesseparle.cd
        </p>
        <FlagStripe />
      </div>
    </div>
  );
}
