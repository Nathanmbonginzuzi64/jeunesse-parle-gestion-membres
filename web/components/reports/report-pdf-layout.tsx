/* eslint-disable @next/next/no-img-element */

/**
 * Layout PDF institutionnel.
 * Couleurs en hex / rgb inline uniquement — Tailwind v4 (oklch sur slate-*)
 * rend le texte invisible avec html2canvas.
 */

import { formatDateLong } from "@/lib/datetime";
import { PERIOD_LABELS, STATUS_LABELS } from "@/lib/reports/types";
import type { ReportFiltersState } from "@/lib/reports/api-types";
import { formatNumber } from "@/lib/utils";

const C = {
  white: "#ffffff",
  ink: "#101426",
  muted: "#667085",
  mutedSoft: "#475569",
  border: "#e2e8f0",
  borderStrong: "#94a3b8",
  rowAlt: "#f8fafc",
  brand50: "#e7f4fb",
  brand100: "#cfe9f7",
  brand200: "#9ed3ef",
  brand500: "#0087d1",
  brand600: "#0076b8",
  brand700: "#00649c",
  brand800: "#0a4f7a",
} as const;

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
  if (rows.length === 0) return [];
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
      style={{
        width: 794,
        minHeight: 1123,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        backgroundColor: C.white,
        color: C.ink,
        padding: "32px 40px",
        boxSizing: "border-box",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header
        style={{
          borderBottom: `2px solid ${C.brand500}`,
          paddingBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="/logo.jpeg"
              alt="La Jeunesse Parle"
              width={56}
              height={56}
              style={{
                width: 56,
                height: 56,
                borderRadius: "9999px",
                objectFit: "cover",
                border: `2px solid ${C.brand200}`,
                display: "block",
              }}
            />
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: C.brand600,
                }}
              >
                La Jeunesse Parle
              </p>
              <h1 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: C.ink }}>
                {meta.title}
              </h1>
              {meta.subtitle ? (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: C.muted }}>{meta.subtitle}</p>
              ) : null}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 10, color: C.muted }}>
            <p style={{ margin: 0, fontWeight: 600, color: C.mutedSoft }}>Document officiel</p>
            <p style={{ margin: "2px 0 0" }}>Généré le {formatDateLong(new Date(meta.generatedAt))}</p>
            {meta.generatedBy ? <p style={{ margin: "2px 0 0" }}>Par : {meta.generatedBy}</p> : null}
            {meta.pageLabel ? (
              <p style={{ margin: "4px 0 0", fontWeight: 600, color: C.brand700 }}>{meta.pageLabel}</p>
            ) : null}
          </div>
        </div>
        {(tags.length > 0 || meta.scope) && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10 }}>
            {meta.scope ? (
              <span
                style={{
                  borderRadius: 6,
                  backgroundColor: C.brand50,
                  color: C.brand800,
                  padding: "4px 8px",
                  border: `1px solid ${C.brand100}`,
                }}
              >
                {meta.scope}
              </span>
            ) : null}
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  borderRadius: 6,
                  backgroundColor: C.brand50,
                  color: C.brand800,
                  padding: "4px 8px",
                  border: `1px solid ${C.brand100}`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <div style={{ flex: 1, minHeight: 0, paddingTop: 24, paddingBottom: 24, color: C.ink }}>
        {children}
      </div>

      <footer
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${C.border}`,
          paddingTop: 12,
          fontSize: 9,
          color: C.muted,
        }}
      >
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: C.mutedSoft }}>La Jeunesse Parle — RDC</p>
          <p style={{ margin: "2px 0 0" }}>Document confidentiel · Usage institutionnel</p>
        </div>
        <p style={{ margin: 0 }}>
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
  const fontSize = compact ? 9 : 11;

  return (
    <div>
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase",
          color: C.brand700,
        }}
      >
        {title}
      </h3>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize,
          color: C.ink,
        }}
      >
        <thead>
          <tr style={{ backgroundColor: C.brand600, color: C.white }}>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  border: `1px solid ${C.brand700}`,
                  padding: "8px",
                  textAlign: "left",
                  color: C.white,
                  fontWeight: 600,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                style={{
                  border: `1px solid ${C.border}`,
                  padding: "16px 12px",
                  textAlign: "center",
                  color: C.muted,
                }}
              >
                Aucune donnée
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 ? C.rowAlt : C.white }}>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      border: `1px solid ${C.border}`,
                      padding: "6px 8px",
                      color: C.ink,
                    }}
                  >
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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gap: 8,
      }}
    >
      {items.map(({ label, value }) => (
        <div
          key={label}
          style={{
            borderRadius: 8,
            border: `1px solid ${C.border}`,
            backgroundColor: C.rowAlt,
            padding: "8px 12px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            {label}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 18,
              fontWeight: 700,
              color: C.ink,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ReportPdfSummary({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${C.brand100}`,
        backgroundColor: C.brand50,
        padding: "12px 16px",
        fontSize: 11,
        lineHeight: 1.55,
        color: C.mutedSoft,
      }}
    >
      {children}
    </div>
  );
}

export function ReportPdfSignatureBlock() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 32,
        borderTop: `1px solid ${C.border}`,
        paddingTop: 24,
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", color: C.muted }}>
          Validé par
        </p>
        <div style={{ marginTop: 32, borderBottom: `1px solid ${C.borderStrong}` }} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 10, textTransform: "uppercase", color: C.muted }}>
          Cachet officiel
        </p>
        <div
          style={{
            marginTop: 16,
            height: 64,
            borderRadius: 4,
            border: `1px dashed ${C.borderStrong}`,
          }}
        />
      </div>
    </div>
  );
}
