"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ScanLine } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { useApi } from "@/lib/hooks";
import type { Paginated, VerificationLogRow, VerificationResult } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export interface VerificationHistoryEntry {
  id: string;
  scannedAt: Date;
  result: VerificationResult;
}

export function VerificationHistory({ entries }: { entries: VerificationHistoryEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Session en cours"
        description="Aperçu temporaire de cette page (complété par l’historique serveur ci-dessous)"
      />
      <CardBody className="divide-y divide-slate-100 p-0">
        {entries.map((entry) => {
          const member = entry.result.member;
          return (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
              {member ? (
                <Avatar src={member.photo_url} name={member.full_name} size="sm" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                  ?
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {member?.full_name ?? "Carte introuvable"}
                </p>
                <p className="text-[11px] text-slate-500">
                  {entry.scannedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {member && ` · ${member.member_code}`}
                </p>
              </div>
              <Badge tone={entry.result.valid ? "success" : "danger"} className="shrink-0">
                {entry.result.valid ? "Valide" : "Rejetée"}
              </Badge>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}

export function ServerVerificationHistory({
  onNewVerification,
}: {
  onNewVerification: () => void;
}) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "valid" | "rejected">("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, resultFilter]);

  const query = {
    page,
    per_page: 15,
    q: debouncedQ || undefined,
    result:
      resultFilter === "all" ? undefined : resultFilter === "valid" ? "valid" : "rejected",
  };
  const history = useApi<{ data: VerificationLogRow[]; meta: Paginated<unknown>["meta"] }>(
    "/verifications/history",
    query,
    { refreshInterval: 2_500 },
  );

  const meta = history.data?.meta;
  const rows = history.data?.data ?? [];

  return (
    <Card>
      <CardHeader
        title="Historique des vérifications"
        description="Journal paginé avec recherche des membres déjà contrôlés"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/verification/membres">
              <Button type="button" size="sm" variant="outline">
                Membres vérifiés
              </Button>
            </Link>
            <Button type="button" size="sm" onClick={onNewVerification}>
              <Plus className="h-4 w-4" />
              Nouvelle vérification
            </Button>
          </div>
        }
      />
      <CardBody className="space-y-4">
        <Input
          type="search"
          placeholder="Rechercher un membre déjà vérifié…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: "all", label: "Tous" },
              { key: "valid", label: "Valides" },
              { key: "rejected", label: "Rejetés" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setResultFilter(opt.key);
                setPage(1);
              }}
              className={
                resultFilter === opt.key
                  ? "rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {history.error ? <Alert tone="danger">{history.error}</Alert> : null}
        {history.loading && rows.length === 0 ? <TableSkeleton rows={5} /> : null}
        {!history.loading && rows.length === 0 ? (
          <EmptyState
            title="Aucune vérification"
            description="Scannez une carte pour commencer. Le bouton ci-dessus lance un nouveau contrôle."
            action={
              <Button type="button" onClick={onNewVerification}>
                <ScanLine className="h-4 w-4" />
                Nouvelle vérification
              </Button>
            }
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {rows.map((row) => {
              const ok = row.result === "valid";
              return (
                <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                  {row.member ? (
                    <Avatar
                      src={row.member.photo_url}
                      name={row.member.full_name}
                      size="sm"
                    />
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">
                      ?
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {row.member?.full_name ?? "Carte introuvable"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatDateTime(row.created_at) || "—"}
                      {row.member ? ` · ${row.member.member_code}` : ""}
                      {row.context ? ` · ${row.context}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={ok ? "success" : "danger"} className="shrink-0">
                      {ok ? "Valide" : row.result}
                    </Badge>
                    {row.member?.id ? (
                      <Link
                        href={`/membres/${row.member.id}`}
                        className="text-[11px] font-medium text-brand-700 hover:underline"
                      >
                        Détail
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={onNewVerification}
                        className="text-[11px] font-medium text-brand-700 hover:underline"
                      >
                        Nouvelle vérif.
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {meta ? (
          <Pagination
            page={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onChange={setPage}
            label="vérifications"
          />
        ) : null}
      </CardBody>
    </Card>
  );
}

export function VerificationHero({ sessionCount }: { sessionCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200/60 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-5 py-4 text-white shadow-[var(--shadow-elevated)] sm:px-6 sm:py-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/20">
            <ScanLine className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">
              Contrôle d&apos;identité
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Vérification de carte</h1>
            <p className="mt-1 max-w-xl text-sm text-brand-100/90">
              Scan QR ou saisie manuelle — validation instantanée du statut membre et de la carte JP-RDC.
            </p>
          </div>
        </div>
        {sessionCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/15">
            {sessionCount} scan(s) cette session
          </span>
        )}
      </div>
    </div>
  );
}
