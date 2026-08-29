import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

const ICON_TONES = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-red-50 text-red-600 ring-red-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  gold: "bg-gold-500/15 text-brand-800 ring-gold-500/30",
};

export function ChartCard({
  title,
  description,
  icon: Icon,
  tone = "brand",
  loading,
  height = "h-72",
  footer,
  className,
  children,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: keyof typeof ICON_TONES;
  loading?: boolean;
  height?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        title={
          Icon ? (
            <span className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                  ICON_TONES[tone],
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {title}
            </span>
          ) : (
            title
          )
        }
        description={description}
      />
      <CardBody className={cn(height, "relative")}>
        {loading ? <Skeleton className="absolute inset-5 rounded-lg" /> : children}
      </CardBody>
      {footer}
    </Card>
  );
}
