"use client";

import type { ReactNode } from "react";
import { AnimateIn } from "@/components/ui/animate-in";
import { cn } from "@/lib/utils";

type PublicPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  /** Variante visuelle : brand (défaut), deep, light */
  tone?: "brand" | "deep" | "slate";
};

/**
 * Hero unifié des pages publiques — gradients institutionnels + entrée animée.
 */
export function PublicPageHero({
  eyebrow,
  title,
  description,
  children,
  className,
  tone = "brand",
}: PublicPageHeroProps) {
  const tones = {
    brand: "from-brand-900 via-brand-700 to-brand-600",
    deep: "from-brand-950 via-brand-900 to-brand-800",
    slate: "from-slate-900 via-slate-800 to-brand-900",
  } as const;

  return (
    <section className={cn("relative isolate overflow-hidden bg-gradient-to-br text-white", tones[tone], className)}>
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 20%, rgba(250,210,1,0.18) 0%, transparent 38%), radial-gradient(circle at 88% 8%, rgba(60,166,222,0.45) 0%, transparent 40%), radial-gradient(circle at 70% 90%, rgba(206,17,38,0.12) 0%, transparent 35%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-16 lg:py-20">
        <AnimateIn animation="slide-up">
          <p className="text-xs font-semibold tracking-[0.22em] text-brand-100/90 uppercase">{eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-brand-50/90 sm:text-base">{description}</p>
          {children ? <div className="mt-8">{children}</div> : null}
        </AnimateIn>
      </div>
    </section>
  );
}
