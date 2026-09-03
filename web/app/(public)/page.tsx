import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Globe2,
  IdCard,
  MapPin,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimateIn } from "@/components/ui/animate-in";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { StaggerTags } from "@/components/public/stagger-tags";
import { HomeStatsDisplay } from "@/components/public/home-stats";
import { CampaignShowcase } from "@/components/public/campaign-showcase";
import { cn, formatNumber } from "@/lib/utils";
import { getPublicLandingStats } from "@/lib/public-stats";

const FEATURES = [
  {
    icon: Users,
    title: "Un profil national unique",
    text: "Identité, localisation, compétences et historique centralisés dans un dossier sécurisé.",
    className: "sm:col-span-2 lg:row-span-2",
    large: true,
  },
  {
    icon: IdCard,
    title: "Carte officielle",
    text: "Identifiant JP-RDC et QR code vérifiable après validation.",
    className: "",
    large: false,
  },
  {
    icon: QrCode,
    title: "Vérification instantanée",
    text: "Scan ou saisie — résultat immédiat, partout en RDC.",
    className: "",
    large: false,
  },
  {
    icon: MapPin,
    title: "Ancrage territorial",
    text: "Province → structure : une mobilisation ancrée localement.",
    className: "sm:col-span-2",
    large: false,
  },
  {
    icon: ShieldCheck,
    title: "Données protégées",
    text: "Accès par rôle, audit et respect du périmètre territorial.",
    className: "",
    large: false,
  },
];

const STEPS = [
  { n: "01", title: "Inscription", text: "Formulaire guidé en quelques minutes." },
  { n: "02", title: "Vérification", text: "Contrôle des informations dans votre zone." },
  { n: "03", title: "Validation", text: "Activation par un responsable habilité." },
  { n: "04", title: "Carte membre", text: "Émission de la carte et du QR code." },
  { n: "05", title: "Participation", text: "Activités, formations et mobilisation." },
];

const PROVINCES = ["Kinshasa", "Nord-Kivu", "Haut-Katanga", "Kongo-Central", "Kasaï", "Ituri"];

const TESTIMONIALS = [
  {
    quote: "Enfin un registre clair de la jeunesse de notre cellule. Tout est traçable.",
    author: "Responsable — Kinshasa",
  },
  {
    quote: "Ma carte JP-RDC m'a identifié lors de la dernière mobilisation nationale.",
    author: "Nathan M. — Membre actif",
  },
];

export default async function HomePage() {
  const stats = await getPublicLandingStats();

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-brand-800 via-brand-600 to-brand-700 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 25%, rgba(60,166,222,0.55) 0%, transparent 42%), radial-gradient(circle at 85% 10%, rgba(0,135,209,0.45) 0%, transparent 38%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="jp-float pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-brand-400/25 blur-3xl" />
        <div className="jp-float jp-float-delay pointer-events-none absolute -right-10 bottom-10 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-300 via-brand-500 to-brand-400" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <AnimateIn delay={0} animation="fade-in">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/30 bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-brand-200" />
                Plateforme nationale · RDC
              </div>
            </AnimateIn>
            <AnimateIn delay={120} animation="slide-up">
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.12] lg:text-[3.25rem]">
                La voix de la jeunesse,
                <span className="mt-1 block bg-gradient-to-r from-white via-brand-100 to-brand-200 bg-clip-text text-transparent">
                  organisée et vérifiable.
                </span>
              </h1>
            </AnimateIn>
            <AnimateIn delay={240} animation="slide-up">
              <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-50/85">
                Inscrire, identifier et mobiliser les jeunes de la République Démocratique du Congo —
                un membre, un profil, un identifiant <strong className="font-medium text-white">JP-RDC</strong>, une carte
                et un QR code reconnus sur tout le territoire.
              </p>
            </AnimateIn>
            <AnimateIn delay={360} animation="slide-up">
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/inscription">
                  <Button size="lg" className="jp-pulse-glow bg-brand-500 shadow-lg shadow-brand-900/35 hover:bg-brand-400">
                    Rejoindre Jeunesse Parle
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/verifier">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-brand-200/40 bg-brand-500/10 text-white hover:border-brand-100/50 hover:bg-brand-500/20"
                  >
                    Vérifier un membre
                  </Button>
                </Link>
              </div>
            </AnimateIn>
            <AnimateIn delay={480} animation="fade-in">
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-brand-100/75">
                <li className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-brand-200" />
                  15 – 40 ans
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Globe2 className="h-4 w-4 text-brand-200" />
                  {formatNumber(stats.provinces_covered)} provinces
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-brand-200" />
                  Données sécurisées
                </li>
              </ul>
            </AnimateIn>
          </div>

          <AnimateIn delay={200} animation="scale-in" className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-400/40 via-brand-500/20 to-brand-300/30 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-200/25 bg-brand-500/10 p-3 shadow-2xl backdrop-blur-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpeg"
                alt="Logo officiel La Jeunesse Parle"
                className="aspect-square w-full rounded-[1.25rem] object-cover"
              />
              <div className="absolute inset-x-4 bottom-4 rounded-xl border border-brand-200/25 bg-brand-800/85 px-4 py-3 backdrop-blur-md">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-200 uppercase">
                  La Jeunesse Parle
                </p>
                <p className="mt-0.5 text-sm font-medium text-white">République Démocratique du Congo</p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      <HomeStatsDisplay stats={stats} />

      <CampaignShowcase />

      {/* Features bento */}
      <section className="mx-auto max-w-6xl px-4 py-20 lg:py-24">
        <div className="max-w-2xl">
          <RevealOnScroll delay={0} animation="fade-in">
            <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">Pourquoi nous rejoindre</p>
          </RevealOnScroll>
          <RevealOnScroll delay={120} animation="slide-up">
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-950">
              Une organisation moderne pour une jeunesse engagée
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={240} animation="slide-up">
            <p className="mt-3 text-base leading-relaxed text-brand-700/70">
              Cadre national, structures locales et outils numériques au service de la citoyenneté, de la formation
              et de la mobilisation.
            </p>
          </RevealOnScroll>
        </div>

        <div className="mt-10 grid auto-rows-fr items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 [&>*]:h-full">
          {FEATURES.map((feature, index) => (
            <RevealOnScroll key={feature.title} delay={index * 120} animation="slide-up" className={cn("h-full", feature.className)}>
              <article
                className={cn(
                  "group flex h-full min-h-[11rem] flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition duration-300",
                  "hover:-translate-y-1 hover:border-brand-300 hover:shadow-[var(--shadow-elevated)]",
                )}
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition duration-300 group-hover:scale-105 group-hover:bg-brand-100",
                    feature.large ? "h-12 w-12" : "h-10 w-10",
                  )}
                >
                  <feature.icon className={feature.large ? "h-6 w-6" : "h-5 w-5"} />
                </span>
                <h3 className={cn("mt-4 font-semibold text-brand-950", feature.large && "text-lg")}>
                  {feature.title}
                </h3>
                <p className={cn("mt-2 flex-1 text-brand-700/70", feature.large ? "text-sm leading-relaxed" : "text-sm")}>
                  {feature.text}
                </p>
                {feature.large ? (
                  <Link
                    href="/a-propos"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:gap-2 hover:text-brand-700"
                  >
                    En savoir plus
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <span className="mt-4 block min-h-[1.25rem]" aria-hidden />
                )}
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Parcours */}
      <section className="border-y border-brand-100 bg-gradient-to-b from-brand-50/80 to-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <RevealOnScroll animation="fade-in">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">Parcours membre</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-950">Comment ça fonctionne</h2>
              </div>
              <Link href="/fonctionnement" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Voir le détail →
              </Link>
            </div>
          </RevealOnScroll>

          <ol className="relative mt-12 grid gap-4 lg:grid-cols-5 lg:gap-3">
            <div className="pointer-events-none absolute top-8 hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-500 to-brand-200 lg:left-[10%] lg:right-[10%] lg:block" />
            {STEPS.map((step, index) => (
              <li key={step.n}>
                <RevealOnScroll delay={index * 150} animation="slide-up" className="h-full">
                  <div className="relative h-full rounded-2xl border border-brand-100 bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-md shadow-brand-500/35">
                      {step.n}
                    </span>
                    <p className="mt-4 font-semibold text-brand-950">{step.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-brand-700/70">{step.text}</p>
                    {index < STEPS.length - 1 && (
                      <span className="absolute -right-2 top-9 hidden text-brand-300 lg:block" aria-hidden>
                        →
                      </span>
                    )}
                  </div>
                </RevealOnScroll>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Couverture + témoignages */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <RevealOnScroll delay={0} animation="slide-left">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-600 uppercase">Présence nationale</p>
              <h2 className="mt-2 text-2xl font-semibold text-brand-950">Ancrés sur tout le territoire</h2>
              <p className="mt-3 text-sm leading-relaxed text-brand-700/70">
                Des coordinations provinciales aux cellules de quartier — la jeunesse congolaise se structure
                progressivement, province par province.
              </p>
              <div className="mt-6">
                <StaggerTags
                  tags={PROVINCES}
                  extraLabel={
                    stats.provinces_covered > PROVINCES.length
                      ? `+ ${formatNumber(stats.provinces_covered - PROVINCES.length)} provinces`
                      : undefined
                  }
                  baseDelay={120}
                  step={80}
                />
              </div>
              <RevealOnScroll delay={680} animation="fade-in">
                <Link href="/fonctionnement" className="mt-6 inline-block">
                  <Button variant="secondary" size="sm">
                    Découvrir le parcours
                  </Button>
                </Link>
              </RevealOnScroll>
            </div>
          </RevealOnScroll>

          <div className="space-y-4">
            {TESTIMONIALS.map((item, index) => (
              <RevealOnScroll key={item.author} delay={index * 180} animation="slide-up">
                <blockquote className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition duration-300 hover:border-brand-200 hover:shadow-md">
                  <p className="text-sm leading-relaxed text-brand-900/80">&ldquo;{item.quote}&rdquo;</p>
                  <footer className="mt-3 text-xs font-medium text-brand-600">{item.author}</footer>
                </blockquote>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <RevealOnScroll delay={100} animation="scale-in">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-6 py-12 text-white sm:px-10 sm:py-14">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-400/30 blur-3xl" />
            <div className="jp-float pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brand-300/25 blur-2xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-xl">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Prêt à prendre votre place ?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-brand-50/85 sm:text-base">
                  L&apos;adhésion est ouverte aux jeunes de 15 à 40 ans, partout en RDC. Rejoignez un mouvement
                  qui structure, forme et mobilise la jeunesse congolaise.
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-xs text-brand-100/80">
                  <span className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-4 w-4 text-brand-200" />
                    Identifiant JP-RDC
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-brand-200" />
                    Validation territoriale
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <Link href="/inscription">
                  <Button size="lg" className="w-full bg-white text-brand-700 hover:bg-brand-50 sm:w-auto">
                    Demander mon adhésion
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-brand-200/40 bg-brand-500/10 text-white hover:bg-brand-500/20 sm:w-auto"
                  >
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </div>
  );
}
