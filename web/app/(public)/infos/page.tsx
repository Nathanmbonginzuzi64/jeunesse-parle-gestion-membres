import { PublicPageHero } from "@/components/public/public-page-hero";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { InfosFeed } from "@/components/public/infos-feed";
import { getPublicHomePostsPage } from "@/lib/home-posts";
import { formatNumber } from "@/lib/utils";

const PER_PAGE = 12;

export default async function InfosPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const requested = Number(params.page ?? 1);
  const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;

  const initial = await getPublicHomePostsPage(page, PER_PAGE);
  const total = initial.meta.total;

  return (
    <div className="bg-[var(--background)] pb-16">
      <PublicPageHero
        eyebrow="Actualités"
        title="Publications officielles"
        description="Annonces et moments marquants publiés par l’administration nationale."
      />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <RevealOnScroll>
          <section className="mb-10 rounded-3xl border border-brand-100 bg-gradient-to-br from-white via-brand-50/50 to-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">
              À propos de cette page
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              L&apos;actualité de Jeunesse Parle
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Retrouvez ici les communiqués, campagnes et événements officiels de la plateforme.
              Chaque publication est diffusée par l&apos;administration nationale pour informer
              la jeunesse congolaise, partager les avancées du mouvement et valoriser les
              initiatives sur le terrain. Cliquez sur une carte pour lire le détail, aimer ou
              commenter.
            </p>
            {total > 0 && (
              <p className="mt-4 text-xs font-medium text-slate-500">
                {formatNumber(total)} publication{total > 1 ? "s" : ""} · {PER_PAGE} par page
              </p>
            )}
          </section>
        </RevealOnScroll>

        <InfosFeed initial={initial} page={page} perPage={PER_PAGE} />
      </div>
    </div>
  );
}
