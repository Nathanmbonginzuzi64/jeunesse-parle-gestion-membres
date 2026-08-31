/* eslint-disable @next/next/no-img-element */

import { formatDateLong } from "@/lib/datetime";
import { PERIOD_LABELS, STATUS_LABELS } from "@/lib/reports/types";
import type { ReportFiltersState } from "@/lib/reports/api-types";
import { formatNumber } from "@/lib/utils";

export interface ReportPdfMeta {
  title: string;
  subtitle?: string;
  generatedAt: string;
  generatedBy?: string;
  scope?: string;
  filters?: Partial<ReportFiltersState>;
  pageLabel?: string;
}

export function chunkRows<T>(rows: T[], size = 22): T[][] {
  if (rows.length === 0) return [[]];
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

function filterTags(filters?: Partial<ReportFiltersState>) {
  if (!filters) return [];
  const tags: string[] = [];
  if (filters.period) tags.push(`Période : ${PERIOD_LABELS[filters.period] ?? filters.period}`);
  if (filters.status) tags.push(`Statut : ${STATUS_LABELS[filters.status] ?? filters.status}`);
  if (filters.q) tags.push(`Recherche : ${filters.q}`);
  if (filters.registered_from || filters.registered_to) {
    tags.push(`Inscription : ${filters.registered_from || "…"} → ${filters.registered_to || "…"}`);
  }
  if (filters.from || filters.to) {
    tags.push(`Activités : ${filters.from || "…"} → ${filters.to || "…"}`);
  }
  return tags;
}

export function ReportPdfPage({
  meta,
  page,
  total,
  children,
}: {
  meta: ReportPdfMeta;
  page: number;
  total: number;
  children: React.ReactNode;
}) {
  const tags = filterTags(meta.filters);

  return (
    <div
      data-report-page
      className="mx-auto flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-8"
      style={{ width: 794, minHeight: 1123 }}
    >
      <header className="border-b-2 border-brand-500 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="La Jeunesse Parle"
              width={56}
              height={56}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-brand-200"
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">
                La Jeunesse Parle
              </p>
              <h1 className="text-lg font-bold text-slate-900">{meta.title}</h1>
              {meta.subtitle ? <p className="text-xs text-slate-500">{meta.subtitle}</p> : null}
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">Document officiel</p>
            <p>Généré le {formatDateLong(new Date(meta.generatedAt))}</p>
            {meta.generatedBy ? <p>Par : {meta.generatedBy}</p> : null}
            {meta.pageLabel ? <p className="mt-1 font-medium text-brand-700">{meta.pageLabel}</p> : null}
          </div>
        </div>
        {(tags.length > 0 || meta.scope) && (
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            {meta.scope ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 text-brand-800 ring-1 ring-brand-100">
                {meta.scope}
              </span>
            ) : null}
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-brand-50 px-2 py-1 text-brand-800 ring-1 ring-brand-100"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 py-6">{children}</div>

      <footer className="mt-auto flex justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-500">
        <div>
          <p className="font-semibold text-slate-700">La Jeunesse Parle — RDC</p>
          <p>Document confidentiel · Usage institutionnel</p>
        </div>
        <p>
          Page {page} / {total}
        </p>
      </footer>
    </div>
  );
}

export function ReportPdfTable({
  title,
  headers,
  rows,
  compact,
}: {
  title: string;
  headers: string[];
  rows: Array<Array<string | number>>;
  compact?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-brand-700">{title}</h3>
      <table className={`w-full border-collapse ${compact ? "text-[9px]" : "text-[11px]"}`}>
        <thead>
          <tr className="bg-brand-600 text-white">
            {headers.map((h) => (
              <th key={h} className="border border-brand-700 px-2 py-2 text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="border border-slate-200 px-3 py-4 text-center text-slate-500">
                Aucune donnée
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={i % 2 ? "bg-slate-50" : "bg-white"}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-slate-200 px-2 py-1.5">
                    {typeof cell === "number" ? formatNumber(cell) : cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ReportPdfKpiGrid({
  items,
}: {
  items: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ label, value }) => (
        <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[9px] uppercase text-slate-500">{label}</p>
          <p className="text-lg font-bold tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportPdfSummary({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50/50 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
      {children}
    </div>
  );
}

export function ReportPdfSignatureBlock() {
  return (
    <div className="grid grid-cols-2 gap-8 border-t pt-6">
      <div>
        <p className="text-[10px] uppercase text-slate-500">Validé par</p>
        <div className="mt-8 border-b border-slate-400" />
      </div>
      <div>
        <p className="text-[10px] uppercase text-slate-500">Cachet officiel</p>
        <div className="mt-4 h-16 rounded border border-dashed border-slate-300" />
      </div>
    </div>
  );
}
