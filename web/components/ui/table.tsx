"use client";

import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import { Button } from "./button";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[44rem] border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function Th({
  className,
  sortable,
  active,
  direction,
  onSort,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  sortable?: boolean;
  active?: boolean;
  direction?: "asc" | "desc";
  onSort?: () => void;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold text-slate-600",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex items-center gap-1 transition-colors hover:text-brand-700",
            active && "text-brand-700",
          )}
        >
          {children}
          {active && <span aria-hidden>{direction === "asc" ? "↑" : "↓"}</span>}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-slate-100 px-4 py-3 text-slate-700", className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-slate-50/70", className)} {...props} />;
}

export function Pagination({
  page,
  lastPage,
  total,
  perPage,
  onChange,
  label = "éléments",
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage?: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (total === 0) return null;

  const from = perPage ? (page - 1) * perPage + 1 : null;
  const to = perPage ? Math.min(page * perPage, total) : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        {from && to ? (
          <>
            {formatNumber(from)}–{formatNumber(to)} sur <strong>{formatNumber(total)}</strong> {label}
          </>
        ) : (
          <>
            <strong>{formatNumber(total)}</strong> {label}
          </>
        )}
      </p>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Précédent</span>
        </Button>
        <span className="px-2 text-xs text-slate-600">
          Page {page} / {lastPage}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= lastPage}
          aria-label="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function DefinitionList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode }>;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-slate-900">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
