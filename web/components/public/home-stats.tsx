import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { dashboardCardGrid } from "@/components/ui/kpi";
import type { PublicLandingStats } from "@/lib/public-stats";
import { cn, formatNumber } from "@/lib/utils";

const STAT_META = [
  { key: "members_total" as const, label: "Membres recensés", accent: "border-brand-500" },
  { key: "provinces_covered" as const, label: "Provinces couvertes", accent: "border-brand-400" },
  { key: "structures_active" as const, label: "Structures actives", accent: "border-brand-600" },
  { key: "cards_verified" as const, label: "Cartes vérifiées", accent: "border-brand-300" },
];

export function HomeStatsDisplay({
  stats,
  overlap = true,
}: {
  stats: PublicLandingStats;
  overlap?: boolean;
}) {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-4">
      <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4", overlap ? "-mt-10" : "mt-0")}>
        {STAT_META.map((stat, index) => (
          <RevealOnScroll key={stat.label} delay={index * 140} animation="scale-in" className="h-full">
            <article
              className={cn(
                "flex h-full min-h-[6.5rem] flex-col justify-between rounded-2xl border border-brand-100 bg-white p-5 shadow-[var(--shadow-elevated)]",
                "border-t-[3px] transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg",
                stat.accent,
              )}
            >
              <p className="text-3xl font-semibold tracking-tight text-brand-800 tabular-nums">
                {formatNumber(stats[stat.key])}
              </p>
              <p className="mt-1 text-xs font-medium text-brand-600/80">{stat.label}</p>
            </article>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
