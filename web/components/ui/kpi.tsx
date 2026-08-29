import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card } from "./card";
import { cn, formatNumber } from "@/lib/utils";

const TONES = {
  neutral: "bg-slate-50 text-slate-600 ring-slate-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-red-100",
  info: "bg-brand-50 text-brand-700 ring-brand-100",
};

const ACCENTS = {
  neutral: "before:bg-slate-300",
  success: "before:bg-emerald-500",
  warning: "before:bg-amber-400",
  danger: "before:bg-flag-red",
  info: "before:bg-brand-500",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
  trend,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  href?: string;
  trend?: string;
}) {
  const meta = trend || hint;

  const content = (
    <Card
      className={cn(
        "relative flex h-full min-h-[7.5rem] flex-col overflow-hidden p-4 transition-shadow duration-200",
        "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
        ACCENTS[tone],
        href && "hover:shadow-[var(--shadow-elevated)]",
      )}
    >
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="line-clamp-2 min-h-[2rem] text-xs font-medium tracking-wide text-slate-500 uppercase">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
          <p
            className={cn(
              "mt-auto min-h-[1.25rem] pt-2 text-[11px] leading-snug text-slate-400",
              !meta && "invisible",
            )}
          >
            {trend && (
              <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600">
                <TrendingUp className="h-3 w-3" aria-hidden />
                {trend}
                {hint ? ` · ${hint}` : ""}
              </span>
            )}
            {!trend && hint}
          </p>
        </div>
        {Icon && (
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              TONES[tone],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full outline-offset-4">
        {content}
      </Link>
    );
  }

  return content;
}

export const StatCard = KpiCard;

/** Grille dashboard : cartes KPI / liens de même hauteur par ligne. */
export const dashboardCardGrid =
  "grid items-stretch gap-4 [&>*]:h-full";
