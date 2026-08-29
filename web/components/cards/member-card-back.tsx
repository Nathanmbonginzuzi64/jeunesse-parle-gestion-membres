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
    <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] items-baseline gap-2 border-b border-slate-100 py-1 last:border-0">
      <span className="text-[8px] font-semibold tracking-[0.1em] text-slate-400 uppercase">{label}</span>
      <span className="truncate text-right text-[10px] font-semibold text-brand-950" title={value ?? undefined}>
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
      <header className="relative flex items-center gap-2 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3.5 py-2 sm:px-4">
        <Logo size={26} className="ring-white/25" />
        <p className="truncate text-[11px] font-bold tracking-[0.08em] text-white uppercase">
          {render.organization} — RDC
        </p>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col px-3.5 py-2 sm:px-4">
        <h2 className="text-[12px] font-bold tracking-wide text-brand-800 uppercase">Carte de membre</h2>
        <p className="mt-1 max-w-prose text-[8px] leading-snug text-slate-500">
          Cette carte atteste de l&apos;enregistrement du titulaire dans le système Jeunesse Parle. La validité peut
          être vérifiée via le QR Code. En cas de perte, contactez immédiatement votre structure.
        </p>

        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-0.5">
          <MetaRow label="ID membre" value={render.member_code} />
          <MetaRow label="Date d'émission" value={formatShortDate(render.issued_at)} />
          <MetaRow label="Date d'expiration" value={formatShortDate(render.expires_at)} />
          <MetaRow label="Statut de la carte" value={render.card_status_label || render.status} />
          <MetaRow label="Structure d'appartenance" value={structure} />
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div className="min-w-0 flex-1 pb-0.5">
            <div className="mb-1 h-px w-full max-w-[9rem] bg-slate-300" />
            <p className="text-[8px] tracking-wide text-slate-400 uppercase">Signature du titulaire</p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-brand-700/80 text-center shadow-sm">
            <span className="px-0.5 text-[7px] font-bold leading-tight tracking-wide text-brand-800 uppercase">
              Cachet
              <br />
              officiel
            </span>
          </div>

          <MemberQrCode value={qrValue} size={44} label="QR secondaire" compact className="shrink-0" />
        </div>
      </div>

      <div className="relative mt-auto border-t border-slate-100 bg-slate-50/60">
        <p className="px-4 py-2 text-center text-[11px] font-semibold tracking-wide text-brand-800">
          www.jeunesseparle.cd · contact@jeunesseparle.cd
        </p>
        <FlagStripe />
      </div>
    </div>
  );
}
