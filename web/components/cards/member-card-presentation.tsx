"use client";

import { MemberCardBack } from "@/components/cards/member-card-back";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import type { CardRender } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MemberCardPresentation({
  render,
  className,
  showLabels = true,
}: {
  render: CardRender;
  className?: string;
  showLabels?: boolean;
}) {
  return (
    <div className={cn("member-card-print-faces grid w-full gap-6 lg:grid-cols-2 lg:gap-8", className)}>
      <figure className="member-card-print-face mx-auto w-full max-w-[32rem]">
        {showLabels && (
          <figcaption className="no-print mb-2 flex items-center justify-between text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            <span>Recto</span>
            <span className="font-mono normal-case tracking-normal text-slate-300">{render.member_code}</span>
          </figcaption>
        )}
        <MemberCardVisual render={render} className="mx-auto" />
      </figure>
      <figure className="member-card-print-face mx-auto w-full max-w-[32rem]">
        {showLabels && (
          <figcaption className="no-print mb-2 text-[11px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
            Verso
          </figcaption>
        )}
        <MemberCardBack render={render} className="mx-auto" />
      </figure>
    </div>
  );
}
