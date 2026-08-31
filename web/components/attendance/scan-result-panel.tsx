"use client";

import Link from "next/link";
import { CheckCircle2, MapPin, ScanLine, UserCheck } from "lucide-react";
import { PublicAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

export interface ScanResultData {
  message: string;
  member: {
    member_code: string;
    full_name: string;
    photo_url: string | null;
    status: string;
    structure: string | null;
    province: string | null;
  };
  activity: { id: number; title: string };
}

export function ScanResultPanel({
  result,
  error,
  onClear,
}: {
  result: ScanResultData | null;
  error: string | null;
  onClear?: () => void;
}) {
  if (error && !result) {
    return (
      <Card className="h-full border-red-200/80 bg-gradient-to-br from-red-50/60 to-white">
        <CardHeader title="Échec du pointage" />
        <CardBody>
          <Alert tone="error">{error}</Alert>
        </CardBody>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="h-full border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white">
        <CardHeader title="Dernier pointage" description="Le résultat s'affichera ici après identification" />
        <CardBody className="flex min-h-[280px] flex-col items-center justify-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100">
            <ScanLine className="h-8 w-8 text-brand-400" />
          </span>
          <p className="text-sm font-medium text-slate-700">En attente de scan</p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            Identifiez un membre pour confirmer sa présence à l&apos;activité sélectionnée.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "h-full overflow-hidden border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white",
        "shadow-[0_0_0_1px_rgba(16,185,129,0.08)]",
      )}
    >
      <CardHeader
        title="Présence confirmée"
        description={result.message}
        action={
          onClear ? (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Effacer
            </Button>
          ) : null
        }
      />
      <CardBody className="space-y-5">
        <div className="flex items-center gap-2 rounded-xl bg-emerald-600/10 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/60">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Pointage enregistré avec succès
        </div>

        <div className="flex items-start gap-4">
          <PublicAvatar src={result.member.photo_url} name={result.member.full_name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-slate-900">{result.member.full_name}</p>
            <p className="font-mono text-xs text-brand-700">{result.member.member_code}</p>
            <div className="mt-2">
              <Badge tone="success">{result.member.status}</Badge>
            </div>
          </div>
        </div>

        <dl className="grid gap-3 rounded-xl border border-slate-100 bg-white/70 p-4 text-sm">
          <div className="flex items-start gap-2">
            <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <div>
              <dt className="text-xs text-slate-400">Activité</dt>
              <dd className="font-medium text-slate-800">{result.activity.title}</dd>
            </div>
          </div>
          {result.member.structure ? (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Structure</dt>
                <dd className="text-slate-700">{result.member.structure}</dd>
                {result.member.province ? (
                  <dd className="text-xs text-slate-500">{result.member.province}</dd>
                ) : null}
              </div>
            </div>
          ) : null}
        </dl>

        <Link href={`/membres?search=${encodeURIComponent(result.member.member_code)}`}>
          <Button variant="outline" className="w-full" size="sm">
            Voir le dossier membre
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
