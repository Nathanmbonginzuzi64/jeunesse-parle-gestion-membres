import Link from "next/link";
import { Database, Download, FileJson, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeStatsDisplay } from "@/components/public/home-stats";
import {
  ARCHIVED_NEWS,
  CAMPAIGN_SOURCE,
  OPEN_DATA_SNAPSHOT,
} from "@/lib/content/jeunesse-parle-archive";
import { formatNumber } from "@/lib/utils";
import { getPublicLandingStats } from "@/lib/public-stats";

export default async function OpenDataPage() {
  const liveStats = await getPublicLandingStats();
  const archivePayload = {
    source: CAMPAIGN_SOURCE,
    snapshot: OPEN_DATA_SNAPSHOT,
    news: ARCHIVED_NEWS,
    platform_stats: liveStats,
  };

  return (
    <div className="bg-slate-50 pb-16">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(0,135,209,0.45), transparent 40%), radial-gradient(circle at 80% 0%, rgba(206,17,38,0.25), transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-100">
            <Database className="h-3.5 w-3.5" />
            Open Data · Jeunesse Parle
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Indicateurs ouverts de la campagne et de la plateforme
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            {OPEN_DATA_SNAPSHOT.sourceNote} Mise à jour archive : {OPEN_DATA_SNAPSHOT.updatedAt}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`data:application/json,${encodeURIComponent(JSON.stringify(archivePayload, null, 2))}`}
              download="jeunesse-parle-open-data.json"
            >
              <Button className="bg-brand-500 hover:bg-brand-400">
                <Download className="h-4 w-4" />
                Télécharger le jeu de données JSON
              </Button>
            </a>
            <Link href="/infos">
              <Button variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                Voir les actualités archivées
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Statistiques plateforme (live)</h2>
          <p className="mt-1 text-sm text-slate-500">API publique `/public/stats` — 0 si le backend est hors ligne.</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <HomeStatsDisplay stats={liveStats} overlap={false} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Indicateurs campagne (archive)</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OPEN_DATA_SNAPSHOT.kpis.map((kpi) => (
              <article
                key={kpi.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{kpi.label}</p>
                <p className="mt-3 text-3xl font-bold tabular-nums text-brand-700">
                  {formatNumber(kpi.value)}
                  {kpi.suffix ?? ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">{kpi.unit}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-slate-900">Déploiement territorial</h3>
            </div>
            <ul className="mt-5 space-y-4">
              {OPEN_DATA_SNAPSHOT.deployment.map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{row.label}</span>
                    <span className="text-xs text-slate-500">
                      {row.status} · {row.progress}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                      style={{ width: `${row.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Répartition des audiences</h3>
            <ul className="mt-5 space-y-3">
              {OPEN_DATA_SNAPSHOT.audiences.map((a) => (
                <li key={a.label} className="flex items-center gap-3">
                  <span className="w-24 text-sm font-medium text-slate-700">{a.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-800"
                      style={{ width: `${a.share}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs tabular-nums text-slate-500">{a.share}%</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Jeux de données disponibles</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {OPEN_DATA_SNAPSHOT.datasets.map((ds) => (
              <article key={ds.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <FileJson className="h-5 w-5 text-brand-600" />
                <h3 className="mt-3 font-semibold text-slate-900">{ds.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{ds.description}</p>
                <p className="mt-4 text-xs text-slate-500">
                  {ds.format} · {ds.records} enregistrements
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
