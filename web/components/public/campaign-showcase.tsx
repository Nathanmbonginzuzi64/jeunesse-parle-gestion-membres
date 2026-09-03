"use client";

import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import {
  ABOUT_STORY,
  CAMPAIGN_AUDIENCE,
  CAMPAIGN_INTRO,
  CAMPAIGN_PILLARS,
  CAMPAIGN_STEPS,
  CAMPAIGN_WHY,
  INITIATOR,
} from "@/lib/content/jeunesse-parle-archive";

export function CampaignShowcase() {
  return (
    <div className="mt-16 bg-white sm:mt-20 lg:mt-24">
      <section className="relative isolate overflow-hidden border-b border-slate-200 bg-slate-950">
        <div className="absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CAMPAIGN_INTRO.heroImage}
            alt="Lancement Jeunesse Parle — Kinshasa"
            className="h-full w-full scale-125 object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-950/75 via-brand-950/35 to-brand-950/15" />
        </div>
        <div className="relative mx-auto grid min-h-[28rem] max-w-6xl items-center gap-10 px-4 pb-16 pt-20 lg:min-h-[34rem] lg:grid-cols-[1.1fr_0.9fr] lg:pb-20 lg:pt-24">
          <RevealOnScroll animation="slide-up">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand-200 uppercase">
              Campagne citoyenne · Archive locale
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {CAMPAIGN_INTRO.title}
            </h2>
            <p className="mt-3 text-lg text-brand-100">{CAMPAIGN_INTRO.subtitle}</p>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-brand-50/85">{CAMPAIGN_INTRO.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/infos">
                <Button className="bg-white text-brand-800 hover:bg-brand-50">
                  Voir les actualités
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/open-data">
                <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                  Open Data
                </Button>
              </Link>
            </div>
          </RevealOnScroll>
          <RevealOnScroll animation="scale-in" delay={120} className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/30 shadow-2xl backdrop-blur">
              <video
                className="aspect-video w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                poster={CAMPAIGN_INTRO.heroImage}
              >
                <source src={CAMPAIGN_INTRO.heroVideo} type="video/mp4" />
              </video>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <RevealOnScroll animation="slide-up">
            <div className="overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={INITIATOR.portrait} alt={INITIATOR.name} className="aspect-[4/5] w-full object-cover" />
            </div>
          </RevealOnScroll>
          <RevealOnScroll animation="slide-up" delay={100}>
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">L&apos;initiateur</p>
            <h3 className="mt-2 text-3xl font-semibold text-slate-900">{INITIATOR.name}</h3>
            <p className="mt-2 text-sm font-medium text-brand-700">{INITIATOR.role}</p>
            <blockquote className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
              <Quote className="h-5 w-5 text-brand-500" />
              <p className="mt-3 text-base leading-relaxed text-slate-800 italic">&ldquo;{INITIATOR.quote}&rdquo;</p>
            </blockquote>
            <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
              {ABOUT_STORY.paragraphs.slice(0, 2).map((p) => (
                <p key={p.slice(0, 24)}>{p}</p>
              ))}
            </div>
            <Link href="/a-propos" className="mt-6 inline-flex text-sm font-semibold text-brand-700 hover:underline">
              Lire la page À propos →
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <RevealOnScroll>
            <h3 className="text-2xl font-semibold text-slate-900">Pourquoi cette plateforme ?</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Les trois piliers de la campagne constitutionnelle, conservés localement dans cette application.
            </p>
          </RevealOnScroll>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {CAMPAIGN_WHY.map((item, i) => (
              <RevealOnScroll key={item.title} delay={i * 80} animation="slide-up">
                <article className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold tracking-wider text-brand-600 uppercase">0{i + 1}</p>
                  <h4 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPAIGN_PILLARS.map((item) => (
            <article key={item.title} className="rounded-2xl border border-brand-100 bg-gradient-to-br from-white to-brand-50/40 p-5">
              <h4 className="font-semibold text-slate-900">{item.title}</h4>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {CAMPAIGN_STEPS.map((step) => (
            <div key={step.n} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {step.n}
              </span>
              <h4 className="mt-4 font-semibold text-slate-900">{step.title}</h4>
              <p className="mt-2 text-sm text-slate-600">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-slate-900">À qui s&apos;adresse cette plateforme ?</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPAIGN_AUDIENCE.map((a) => (
              <div key={a.label} className="rounded-xl bg-slate-900 px-4 py-4 text-white">
                <p className="text-sm font-semibold">{a.label}</p>
                <p className="mt-1 text-xs text-slate-300">{a.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h3 className="text-xl font-semibold text-slate-900">Galerie campagne</h3>
          <p className="mt-1 text-sm text-slate-500">Images locales — disponibles hors ligne.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {INITIATOR.gallery.map((src, i) => (
              <div key={src} className="overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Campagne Jeunesse Parle ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
