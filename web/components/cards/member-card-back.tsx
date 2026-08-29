"use client";

import { Logo } from "@/components/brand/logo";
import { MemberQrCode } from "@/components/cards/member-qr-code";
import type { CardRender } from "@/lib/types";
import { cn, formatShortDate } from "@/lib/utils";

function FlagStripe() {
  return (
    <div className="flex h-1 w-full shrink-0 overflow-hidden" aria-hidden>
      <span className="w-1/3 bg-flag-red" />
      <span className="w-1/3 bg-brand-600" />
      <span className="w-1/3 bg-flag-yellow" />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-1.5 border-b border-slate-100/90 py-[3px] last:border-0">
      <span className="text-[7px] font-semibold tracking-[0.08em] text-slate-400 uppercase">{label}</span>
      <span className="truncate text-right text-[9px] font-semibold text-brand-950" title={value ?? undefined}>
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
      <header className="relative flex shrink-0 items-center gap-1.5 bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 px-3 py-1.5">
        <Logo size={22} className="ring-white/25" />
        <p className="truncate text-[10px] font-bold tracking-[0.06em] text-white uppercase">
          {render.organization} — RDC
        </p>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col justify-between gap-1.5 overflow-hidden px-3 py-1.5">
        <div className="min-h-0 shrink overflow-hidden">
          <h2 className="text-[10px] font-bold leading-none tracking-wide text-brand-800 uppercase">
            Carte de membre
          </h2>
          <p className="mt-1 line-clamp-2 text-[7px] leading-tight text-slate-500">
            Atteste l&apos;enregistrement du titulaire. Validité vérifiable via QR. En cas de perte, contactez votre
            structure.
          </p>

          <div className="mt-1.5 rounded-md border border-slate-100 bg-slate-50/80 px-2 py-0.5">
            <MetaRow label="ID membre" value={render.member_code} />
            <MetaRow label="Date d'émission" value={formatShortDate(render.issued_at)} />
            <MetaRow label="Date d'expiration" value={formatShortDate(render.expires_at)} />
            <MetaRow label="Statut de la carte" value={render.card_status_label || render.status} />
            <MetaRow label="Structure" value={structure} />
          </div>
        </div>

        <div className="flex shrink-0 items-end justify-between gap-2 pt-0.5">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 h-px w-full max-w-[7.5rem] bg-slate-300" />
            <p className="text-[7px] tracking-wide text-slate-400 uppercase">Signature du titulaire</p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-700/80 text-center">
            <span className="px-0.5 text-[6px] font-bold leading-tight tracking-wide text-brand-800 uppercase">
              Cachet
              <br />
              officiel
            </span>
          </div>

          <MemberQrCode value={qrValue} size={36} label="QR sec." compact className="shrink-0" />
        </div>
      </div>

      <div className="relative shrink-0 border-t border-slate-100 bg-slate-50/70">
        <p className="px-3 py-1 text-center text-[10px] font-semibold tracking-wide text-brand-800">
          www.jeunesseparle.cd · contact@jeunesseparle.cd
        </p>
        <FlagStripe />
      </div>
    </div>
  );
}
