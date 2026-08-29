"use client";

import Link from "next/link";
import { Eye, Printer } from "lucide-react";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import { CardStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CardVisualItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CardsVisualGrid({ items }: { items: CardVisualItem[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.card.id}
          className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition hover:border-brand-200 hover:shadow-[var(--shadow-elevated)]"
        >
          <div className="relative bg-gradient-to-b from-brand-950/5 via-slate-50 to-slate-100 p-4 pb-6">
            <div
              className={cn(
                "mx-auto transition duration-300 group-hover:scale-[1.02]",
                !item.card.is_valid && "opacity-75 grayscale-[0.15]",
              )}
            >
              <MemberCardVisual render={item.render} className="mx-auto shadow-lg" />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 border-t border-slate-100 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{item.full_name}</p>
                <p className="font-mono text-[11px] text-brand-700">{item.card.card_number}</p>
              </div>
              <CardStatusBadge status={item.card.status} label={item.card.status_label} />
            </div>

            <div className="mt-auto flex flex-wrap gap-2">
              <Link href={`/cartes/apercu/${item.member_id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </Button>
              </Link>
              <Link href={`/cartes/apercu/${item.member_id}`}>
                <Button variant="ghost" size="sm" aria-label="Imprimer">
                  <Printer className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
