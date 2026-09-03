"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicPageHero } from "@/components/public/public-page-hero";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Inscription",
    text: "Vous renseignez votre identité, vos contacts, votre localisation et votre profil.",
  },
  {
    title: "Vérification",
    text: "Les informations sont contrôlées pour éviter les doublons et sécuriser le dossier.",
  },
  {
    title: "Validation",
    text: "Un responsable de votre périmètre active l’adhésion.",
  },
  {
    title: "Carte membre",
    text: "Une carte avec identifiant JP-RDC et QR code est générée.",
  },
  {
    title: "Participation",
    text: "Vous rejoignez les activités, formations et missions de votre structure.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-[var(--background)] pb-16">
      <PublicPageHero
        eyebrow="Fonctionnement"
        title="Comment ça marche"
        description="Un parcours simple et sécurisé, du premier formulaire jusqu’à la carte officielle JP-RDC."
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-14">
        <ol className="space-y-0">
          {STEPS.map((step, index) => (
            <RevealOnScroll key={step.title} delay={index * 70}>
              <li className="relative flex gap-4 pb-10 pl-2">
                {index < STEPS.length - 1 && (
                  <span className="absolute top-10 left-[1.15rem] h-[calc(100%-1.75rem)] w-px bg-gradient-to-b from-brand-300 to-brand-100" />
                )}
                <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-xs font-bold text-white shadow-md shadow-brand-600/25 ring-4 ring-white">
                  {index + 1}
                </span>
                <div className="rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-[var(--shadow-card)]">
                  <h2 className="font-semibold text-slate-900">{step.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.text}</p>
                </div>
              </li>
            </RevealOnScroll>
          ))}
        </ol>

        <RevealOnScroll delay={120}>
          <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 to-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm font-medium text-brand-900">Prêt à rejoindre le mouvement ?</p>
            <p className="mt-1 text-sm text-slate-600">L’inscription prend quelques minutes.</p>
            <Link href="/inscription" className="mt-4 inline-block">
              <Button>
                Commencer l’inscription
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </div>
  );
}
