"use client";

import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";

const ITEMS = [
  {
    type: "Formation",
    title: "Numérique et citoyenneté",
    when: "Septembre 2026",
    where: "Kinshasa",
    accent: "from-brand-600 to-brand-500",
  },
  {
    type: "Événement",
    title: "Conférence entrepreneuriat des jeunes",
    when: "8 septembre 2026",
    where: "Gombe",
    accent: "from-amber-500 to-gold-500",
  },
  {
    type: "Programme",
    title: "Cellules provinciales",
    when: "En cours",
    where: "26 provinces",
    accent: "from-emerald-600 to-teal-500",
  },
  {
    type: "Appel à projets",
    title: "Initiatives communautaires",
    when: "Ouvert",
    where: "National",
    accent: "from-rose-600 to-flag-red",
  },
];

export default function OpportunitiesPage() {
  return (
    <div className="bg-[var(--background)] pb-16">
      <PublicPageHero
        eyebrow="Opportunités"
        title="Formations, programmes & appels"
        description="Formations, événements, programmes et appels à projets réservés aux membres identifiés Jeunesse Parle."
        tone="slate"
      />

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:py-14">
        {ITEMS.map((item, index) => (
          <RevealOnScroll key={item.title} delay={index * 60}>
            <article className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
              <div className={`h-1.5 bg-gradient-to-r ${item.accent}`} />
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-800">
                      <Sparkles className="h-3 w-3" />
                      {item.type}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-brand-600" />
                      {item.when}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-brand-600" />
                      {item.where}
                    </span>
                  </div>
                </div>
                <span className="self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-800">
                  Membres JP
                </span>
              </div>
            </article>
          </RevealOnScroll>
        ))}
      </div>
    </div>
  );
}
