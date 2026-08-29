"use client";

import { Download, Printer, Share2 } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import { MemberCardBack } from "@/components/cards/member-card-back";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import type { CardRender, MemberCard } from "@/lib/types";

export default function MyCardPage() {
  const { member } = useAuth();
  const { data, loading, error } = useApi<{ data: MemberCard; render: CardRender }>(
    member ? `/members/${member.id}/card` : null,
  );

  if (!member) {
    return <Alert tone="info">Aucun dossier membre n&apos;est rattaché à ce compte.</Alert>;
  }

  if (loading) return <PageLoader label="Chargement de votre carte…" />;
  if (error || !data?.render) {
    return (
      <EmptyState
        title="Carte non disponible"
        description={
          member.status === "pending"
            ? "Votre dossier est en attente de validation. La carte sera générée automatiquement ensuite."
            : (error ?? "Aucune carte active.")
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader
        title="Ma carte de membre"
        description="Présentez le QR code pour être identifié. Aucune donnée personnelle n'y est encodée."
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          </div>
        }
      />

      <div id="member-card-print" className="space-y-6">
        <MemberCardVisual render={data.render} className="mx-auto" />
        <MemberCardBack organization={data.render.organization} verificationUrl={data.render.verification_url} />
      </div>

      <Card className="no-print">
        <CardBody className="flex items-start gap-3 text-sm text-slate-600">
          <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            En cas de perte, contactez votre structure. L&apos;ancienne carte sera désactivée avant émission d&apos;une
            nouvelle.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
