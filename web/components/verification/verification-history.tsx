"use client";

import { ScanLine } from "lucide-react";
import { PublicAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { VerificationResult } from "@/lib/types";

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
        title="Vérifications récentes"
        description="Historique de cette session (non enregistré en base)"
      />
      <CardBody className="divide-y divide-slate-100 p-0">
        {entries.map((entry) => {
          const member = entry.result.member;
          return (
            <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
              {member ? (
                <PublicAvatar src={member.photo_url} name={member.full_name} size="sm" />
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
