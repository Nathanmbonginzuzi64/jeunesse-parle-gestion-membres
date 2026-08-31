"use client";

import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AttendanceStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import type { AttendanceRow } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

const METHOD_LABELS: Record<string, string> = {
  qr: "QR Code",
  fingerprint: "Biométrie",
  manual: "Manuel",
};

function methodLabel(method: string | null): string {
  if (!method) return "—";
  return METHOD_LABELS[method] ?? method;
}

function territory(row: AttendanceRow): string {
  return [row.province, row.commune].filter(Boolean).join(" · ") || "—";
}

export function AttendanceSheetTable({
  rows,
  rowOffset = 0,
  onSelect,
}: {
  rows: AttendanceRow[];
  /** Index de départ pour la numérotation (pagination). */
  rowOffset?: number;
  onSelect?: (row: AttendanceRow) => void;
}) {
  return (
    <>
      {/* Mobile */}
      <div className="divide-y divide-slate-100 md:hidden">
        {rows.map((row, index) => (
          <article
            key={row.member_id}
            className={cn("p-4 transition", onSelect && "cursor-pointer hover:bg-brand-50/30")}
            onClick={() => onSelect?.(row)}
            onKeyDown={(e) => {
              if (onSelect && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(row);
              }
            }}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold tabular-nums text-slate-600">
                {rowOffset + index + 1}
              </span>
              <Avatar src={row.photo_url} name={row.full_name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{row.full_name}</p>
                <p className="font-mono text-[11px] text-brand-700">{row.member_code}</p>
                {row.structure ? <p className="mt-0.5 text-xs text-slate-500">{row.structure}</p> : null}
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {territory(row)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {row.member_status_label ? (
                    <MemberStatusBadge status={row.member_status ?? "active"} label={row.member_status_label} />
                  ) : null}
                  {row.status ? (
                    <AttendanceStatusBadge status={row.status} label={row.status_label ?? row.status} />
                  ) : (
                    <span className="text-xs text-slate-400">Non pointé</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {[methodLabel(row.method), row.recorded_at ? formatDateTime(row.recorded_at) : null]
                    .filter((v) => v && v !== "—")
                    .join(" · ") || "—"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Table className="min-w-[56rem]">
          <thead>
            <tr className="bg-gradient-to-r from-brand-50/90 to-slate-50">
              <Th className="w-12 rounded-tl-lg border-b-brand-100 bg-transparent">N°</Th>
              <Th className="min-w-[14rem] border-b-brand-100 bg-transparent">Membre</Th>
              <Th className="border-b-brand-100 bg-transparent">Identifiant</Th>
              <Th className="border-b-brand-100 bg-transparent">Structure</Th>
              <Th className="border-b-brand-100 bg-transparent">Territoire</Th>
              <Th className="border-b-brand-100 bg-transparent">Statut membre</Th>
              <Th className="border-b-brand-100 bg-transparent">Présence</Th>
              <Th className="border-b-brand-100 bg-transparent">Méthode</Th>
              <Th className="border-b-brand-100 bg-transparent">Enregistré le</Th>
              <Th className="border-b-brand-100 bg-transparent">Par</Th>
              <Th className="w-12 rounded-tr-lg border-b-brand-100 bg-transparent" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <Tr
                key={row.member_id}
                className={cn(onSelect && "cursor-pointer")}
                onClick={() => onSelect?.(row)}
              >
                <Td className="py-3.5 text-center text-xs font-semibold tabular-nums text-slate-500">
                  {rowOffset + index + 1}
                </Td>
                <Td className="py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar src={row.photo_url} name={row.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{row.full_name}</p>
                    </div>
                  </div>
                </Td>
                <Td className="py-3.5 font-mono text-xs text-brand-700">{row.member_code}</Td>
                <Td className="py-3.5 text-xs text-slate-600">{row.structure ?? "—"}</Td>
                <Td className="py-3.5 text-xs text-slate-600">{territory(row)}</Td>
                <Td className="py-3.5">
                  {row.member_status_label ? (
                    <MemberStatusBadge status={row.member_status ?? "active"} label={row.member_status_label} />
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="py-3.5">
                  {row.status ? (
                    <AttendanceStatusBadge status={row.status} label={row.status_label ?? row.status} />
                  ) : (
                    <span className="text-xs text-slate-400">Non pointé</span>
                  )}
                </Td>
                <Td className="py-3.5 text-xs text-slate-600">{methodLabel(row.method)}</Td>
                <Td className="py-3.5 text-xs tabular-nums text-slate-500">
                  {row.recorded_at ? formatDateTime(row.recorded_at) : "—"}
                </Td>
                <Td className="py-3.5 text-xs text-slate-600">{row.recorded_by ?? "—"}</Td>
                <Td className="py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <Link href={`/membres/${row.member_id}`}>
                    <Button variant="ghost" size="sm" aria-label="Voir le membre">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
