"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Globe2, Shield, Sparkles } from "lucide-react";
import { DashboardClock } from "@/components/dashboard/dashboard-clock";
import { MiniCalendar } from "@/components/dashboard/mini-calendar";
import { AnimateIn } from "@/components/ui/animate-in";
import { formatDateLong, getTimeGreeting, getWeekNumber } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type DashboardWelcomeBannerProps = {
  firstName: string;
  subtitle?: string;
  roleLabel?: string | null;
  scopeLabel?: string | null;
  actions?: ReactNode;
  chips?: Array<{ label: string; value: string }>;
  className?: string;
};

export function DashboardWelcomeBanner({
  firstName,
  subtitle,
  roleLabel,
  scopeLabel,
  actions,
  chips = [],
  className,
}: DashboardWelcomeBannerProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = getTimeGreeting(now);
  const dateLabel = formatDateLong(now);
  const week = getWeekNumber(now);

  return (
    <AnimateIn animation="fade-in" delay={0}>
      <section
        className={cn(
          "relative mb-5 overflow-hidden rounded-xl border border-brand-600/30 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 px-4 py-3 text-white shadow-md shadow-brand-900/15 sm:px-5 sm:py-3.5",
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 10% 20%, rgba(60,166,222,0.4) 0%, transparent 45%)",
          }}
        />

        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-brand-100">
                <Sparkles className="h-3 w-3 text-gold-300" />
                {dateLabel}
              </span>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {greeting}, {firstName}
                <span className="ml-0.5" aria-hidden>
                  👋
                </span>
              </h1>
            </div>

            {subtitle && (
              <p className="mt-0.5 line-clamp-1 text-xs text-brand-50/80">{subtitle}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {roleLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-brand-50">
                  <Shield className="h-3 w-3 text-brand-200" />
                  {roleLabel}
                </span>
              )}
              {scopeLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-brand-50">
                  <Globe2 className="h-3 w-3 text-brand-200" />
                  {scopeLabel}
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-brand-50">
                S{week}
              </span>
              {chips.slice(0, 3).map((chip) => (
                <span
                  key={chip.label}
                  className="hidden rounded-full border border-white/10 bg-brand-900/30 px-2 py-0.5 text-[10px] text-brand-50 sm:inline-flex"
                >
                  {chip.label} : <strong className="ml-0.5 font-semibold tabular-nums">{chip.value}</strong>
                </span>
              ))}
            </div>

            {actions && <div className="mt-2.5 flex flex-wrap gap-1.5">{actions}</div>}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <AnimateIn animation="scale-in" delay={80}>
              <DashboardClock compact />
            </AnimateIn>
            <AnimateIn animation="scale-in" delay={140}>
              <MiniCalendar compact />
            </AnimateIn>
          </div>
        </div>
      </section>
    </AnimateIn>
  );
}
