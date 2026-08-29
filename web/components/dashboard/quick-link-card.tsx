import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  brand: {
    icon: "bg-brand-100 text-brand-700 group-hover:bg-brand-500 group-hover:text-white",
    border: "hover:border-brand-300 hover:shadow-[var(--shadow-elevated)]",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-500 group-hover:text-white",
    border: "hover:border-emerald-300 hover:shadow-[var(--shadow-elevated)]",
  },
  amber: {
    icon: "bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-white",
    border: "hover:border-amber-300 hover:shadow-[var(--shadow-elevated)]",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white",
    border: "hover:border-slate-300 hover:shadow-[var(--shadow-elevated)]",
  },
};

export function QuickLinkCard({
  href,
  icon: Icon,
  title,
  description,
  tone = "brand",
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: keyof typeof TONES;
}) {
  const styles = TONES[tone];

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full min-h-[5.75rem] items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] transition-all duration-200",
        styles.border,
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-200",
          styles.icon,
        )}
      >
        <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-h-[1.25rem] items-center gap-1 text-sm font-semibold text-slate-900">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
        </span>
        <span className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500">
          {description ?? "Accéder à cette section"}
        </span>
      </span>
    </Link>
  );
}
