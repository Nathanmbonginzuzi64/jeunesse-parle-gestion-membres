import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, Inbox, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Alert({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: "error" | "success" | "warning" | "info";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const config = {
    error: { icon: AlertCircle, style: "bg-red-50 text-red-800 border-red-200" },
    success: { icon: CheckCircle2, style: "bg-emerald-50 text-emerald-800 border-emerald-200" },
    warning: { icon: TriangleAlert, style: "bg-amber-50 text-amber-900 border-amber-200" },
    info: { icon: Info, style: "bg-blue-50 text-blue-800 border-blue-200" },
  }[tone];

  const Icon = config.icon;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-sm", config.style, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 text-xs opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-md", className)} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <Skeleton
              key={columnIndex}
              className={cn("h-9 flex-1", columnIndex === 0 && "max-w-[3rem]")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: typeof Inbox;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="rounded-full bg-slate-100 p-3">
        <Icon className="h-6 w-6 text-slate-400" aria-hidden />
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-5 w-5 animate-spin text-brand-600", className)} aria-label="Chargement" />
  );
}

export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="h-7 w-7" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
