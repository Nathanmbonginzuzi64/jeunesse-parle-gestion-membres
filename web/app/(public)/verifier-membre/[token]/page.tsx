"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ShieldX, HelpCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PublicAvatar } from "@/components/ui/avatar";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DefinitionList } from "@/components/ui/table";
import type { VerificationResult } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const RESULT_UI = {
  valid: { icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50", label: "Membre vérifié" },
  inactive: { icon: AlertTriangle, tone: "text-amber-600 bg-amber-50", label: "Carte inactive" },
  expired: { icon: AlertTriangle, tone: "text-orange-600 bg-orange-50", label: "Carte expirée" },
  revoked: { icon: ShieldX, tone: "text-red-600 bg-red-50", label: "Carte révoquée" },
  not_found: { icon: HelpCircle, tone: "text-slate-500 bg-slate-100", label: "Membre introuvable" },
} as const;

export default function PublicVerificationPage() {
  const params = useParams<{ token: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.token;
    if (!token) return;

    api.public
      .get<VerificationResult>(`/verify/${token}`)
      .then(setResult)
      .catch((caught: unknown) => {
        if (caught instanceof ApiError && caught.payload) {
          setResult(caught.payload as unknown as VerificationResult);
          return;
        }
        setError(caught instanceof ApiError ? caught.message : "Vérification impossible.");
      });
  }, [params.token]);

  if (!result && !error) return <PageLoader label="Vérification de la carte…" />;

  const key = (result?.result ?? "not_found") as keyof typeof RESULT_UI;
  const ui = RESULT_UI[key] ?? RESULT_UI.not_found;
  const Icon = ui.icon;
  const valid = result?.valid === true;
  const member = result?.member;

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className={cn("rounded-full p-3", ui.tone)}>
            <Icon className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{ui.label}</h1>
          <p className="mt-1 text-sm text-slate-500">{result?.message ?? error}</p>
        </div>

        {member && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
              <PublicAvatar src={member.photo_url} name={member.full_name} />
              <div>
                <p className="font-semibold">{member.full_name}</p>
                <p className="font-mono text-xs text-brand-700">{member.member_code}</p>
                <div className="mt-1 flex gap-1">
                  <Badge tone={valid ? "success" : "danger"}>{member.status}</Badge>
                  <Badge>{member.card_status}</Badge>
                </div>
              </div>
            </div>
            <DefinitionList
              columns={1}
              items={[
                { label: "Structure", value: member.structure },
                { label: "Province", value: member.province },
                { label: "Émission", value: formatShortDate(member.issued_at) },
              ]}
            />
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <Link href="/">
            <Button variant="outline">Retour à l&apos;accueil</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
