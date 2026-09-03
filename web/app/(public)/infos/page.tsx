import Link from "next/link";
import { ARCHIVED_NEWS, CAMPAIGN_SOURCE } from "@/lib/content/jeunesse-parle-archive";
import { cn } from "@/lib/utils";

const CATEGORY_STYLE = {
  Actualité: "bg-blue-100 text-blue-800",
  Campagne: "bg-amber-100 text-amber-900",
  Événement: "bg-emerald-100 text-emerald-800",
} as const;

export default function InfosPage() {
  return (
    <div className="bg-slate-50 pb-16">
      <section className="border-b border-slate-200 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-200 uppercase">Actualités</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Annonces & moments marquants
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-50/90">
            Archive locale des actualités de la campagne « La Jeunesse Parle Constitution ».
            Les textes, images et vidéos sont conservés dans cette plateforme même si{" "}
            <span className="font-medium text-white">{CAMPAIGN_SOURCE.url}</span> n&apos;est plus accessible.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        {ARCHIVED_NEWS.map((item) => (
          <article
            key={item.id}
            id={item.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="grid lg:grid-cols-[320px_1fr]">
              <div className="relative flex min-h-[220px] items-center justify-center bg-slate-100">
                {item.video ? (
                  <video
                    controls
                    preload="metadata"
                    poster={item.image}
                    className="max-h-[320px] w-full object-contain lg:absolute lg:inset-0 lg:h-full lg:max-h-none"
                  >
                    <source src={item.video} type="video/mp4" />
                  </video>
                ) : item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="max-h-[320px] w-full object-contain lg:absolute lg:inset-0 lg:h-full lg:max-h-none lg:object-contain"
                  />
                ) : null}
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold uppercase", CATEGORY_STYLE[item.category])}>
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-500">{item.dateLabel}</span>
                </div>
                <h2 className="mt-3 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">{item.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.excerpt}</p>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700">
                  {item.body.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </div>
                {(item.image || item.video) && (
                  <div className="mt-5 flex flex-wrap gap-3 text-xs">
                    {item.image ? (
                      <a href={item.image} download className="font-medium text-brand-700 hover:underline">
                        Télécharger l&apos;image
                      </a>
                    ) : null}
                    {item.video ? (
                      <a href={item.video} download className="font-medium text-brand-700 hover:underline">
                        Télécharger la vidéo
                      </a>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}

        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <p className="text-sm text-slate-600">
            Fil membre connecté :{" "}
            <Link href="/actualites" className="font-semibold text-brand-700 hover:underline">
              /actualites
            </Link>{" "}
            (après connexion)
          </p>
        </div>
      </div>
    </div>
  );
}
