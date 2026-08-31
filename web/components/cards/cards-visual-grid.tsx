"use client";

import Link from "next/link";
import { Eye, Printer } from "lucide-react";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import { CardStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CardVisualItem } from "@/lib/types";
import { cn } from "@/lib/utils";

function chunkPairs(items: CardVisualItem[]): CardVisualItem[][] {
  const pairs: CardVisualItem[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    pairs.push(items.slice(index, index + 2));
  }
  return pairs;
}

export function CardsVisualGrid({ items }: { items: CardVisualItem[] }) {
  const sections = chunkPairs(items);

  return (
    <div className="space-y-8">
      {sections.map((pair, sectionIndex) => (
        <section
          key={`section-${pair.map((item) => item.card.id).join("-")}`}
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-5 sm:p-6"
          aria-label={`Section ${sectionIndex + 1}`}
        >
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Section {sectionIndex + 1}
            </p>
            <p className="text-xs text-slate-400">
              {pair.length} carte{pair.length > 1 ? "s" : ""} — recto
            </p>
          </div>

          <div
            className={cn(
              "grid gap-6 lg:gap-8",
              pair.length === 1 ? "mx-auto max-w-3xl grid-cols-1" : "grid-cols-1 md:grid-cols-2",
            )}
          >
            {pair.map((item) => (
              <article
                key={item.card.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition hover:border-brand-200 hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="relative bg-gradient-to-b from-brand-950/[0.04] via-slate-50 to-white p-4 sm:p-5">
                  <div
                    className={cn(
                      "mx-auto w-full max-w-3xl transition duration-300 group-hover:scale-[1.01]",
                      !item.card.is_valid && "opacity-80 grayscale-[0.12]",
                    )}
                  >
                    <MemberCardVisual render={item.render} className="mx-auto w-full max-w-none shadow-lg" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 border-t border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{item.full_name}</p>
                      <p className="font-mono text-[11px] text-brand-700">{item.card.card_number}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{item.member_code}</p>
                    </div>
                    <CardStatusBadge status={item.card.status} label={item.card.status_label} />
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Link href={`/cartes/apercu/${item.member_id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4" />
                        Aperçu complet
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
        </section>
      ))}
    </div>
  );
}
