import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardSection({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  tone = "brand",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "brand" | "emerald" | "amber" | "slate";
}) {
  const iconTone = {
    brand: "bg-brand-50 text-brand-600 ring-brand-100",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  }[tone];

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
              iconTone,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
