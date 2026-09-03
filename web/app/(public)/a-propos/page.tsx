import Link from "next/link";
import { Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ABOUT_STORY,
  CAMPAIGN_AUDIENCE,
  CAMPAIGN_PILLARS,
  CAMPAIGN_SOURCE,
  INITIATOR,
} from "@/lib/content/jeunesse-parle-archive";

export default function AboutPage() {
  return (
    <div className="bg-white">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/campaign/lancement-kinshasa.jpg" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-950/92 via-brand-900/80 to-brand-700/75" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-200 uppercase">À propos</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            La Jeunesse Parle
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-50/90">
            Mouvement national et plateforme citoyenne pour donner aux jeunes Congolais une voix structurée,
            une identité vérifiable et un cadre d&apos;engagement républicain.
          </p>
          <p className="mt-3 text-xs text-brand-200/80">
            Contenu archivé localement depuis {CAMPAIGN_SOURCE.url} ({CAMPAIGN_SOURCE.archivedAt})
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={INITIATOR.portrait} alt={INITIATOR.name} className="aspect-[4/5] w-full object-cover" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {INITIATOR.gallery.slice(1).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="aspect-square rounded-xl object-cover ring-1 ring-slate-200" />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">L&apos;initiateur</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">{INITIATOR.name}</h2>
          <p className="mt-1 text-sm font-medium text-brand-700">{INITIATOR.role}</p>

          <blockquote className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-5">
            <Quote className="h-5 w-5 text-brand-500" />
            <p className="mt-3 text-base leading-relaxed text-slate-800 italic">&ldquo;{INITIATOR.quote}&rdquo;</p>
          </blockquote>

          <h3 className="mt-10 text-xl font-semibold text-slate-900">{ABOUT_STORY.title}</h3>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
            {ABOUT_STORY.paragraphs.map((p) => (
              <p key={p.slice(0, 32)}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-semibold text-slate-900">Mission, vision et piliers</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {CAMPAIGN_PILLARS.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>

          <h2 className="mt-12 text-xl font-semibold text-slate-900">Publics concernés</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CAMPAIGN_AUDIENCE.map((a) => (
              <div key={a.label} className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <p className="font-semibold text-slate-900">{a.label}</p>
                <p className="mt-1 text-xs text-slate-500">{a.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/infos">
              <Button>Actualités de la campagne</Button>
            </Link>
            <Link href="/open-data">
              <Button variant="outline">Consulter l&apos;Open Data</Button>
            </Link>
            <Link href="/inscription">
              <Button variant="secondary">Devenir membre</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
