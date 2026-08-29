import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumb({
  items,
  className,
}: {
  items: Array<{ href?: string; label: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className={cn("mb-3 flex flex-wrap items-center gap-1 text-xs", className)}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />}
            {item.href && !last ? (
              <Link href={item.href} className="text-slate-500 hover:text-brand-700">
                {item.label}
              </Link>
            ) : (
              <span className={cn(last ? "font-medium text-slate-800" : "text-slate-500")}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
