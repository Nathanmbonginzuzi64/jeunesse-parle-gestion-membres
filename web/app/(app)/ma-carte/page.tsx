"use client";

import { Download, Printer, Share2 } from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { MemberCardPresentation } from "@/components/cards/member-card-presentation";
import { MemberQrCode } from "@/components/cards/member-qr-code";
import { PageHeader } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
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

  const qrValue = data.render.verification_url || data.render.member_code;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="no-print">
        <PageHeader
          title="Ma carte de membre"
          description="Recto / verso officiels — présentez le QR agrandi ci-dessous pour un scan rapide."
          actions={
            <div className="flex flex-wrap gap-2">
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
      </div>

      <DashboardAnimate>
        <div
          id="member-card-print"
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100 via-slate-50 to-white p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-8"
        >
          <MemberCardPresentation render={data.render} />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <Card className="no-print overflow-hidden border-brand-200">
          <CardHeader
            title="QR pour scan agent"
            description="Agrandissez cet écran ou présentez-le à l’agent de vérification."
          />
          <CardBody className="flex flex-col items-center gap-3 bg-gradient-to-b from-white to-brand-50/40 py-8">
            <MemberQrCode
              value={qrValue}
              size={280}
              emphasize
              label={data.render.member_code ?? "Code membre"}
            />
            <p className="max-w-md text-center text-sm text-slate-600">
              Contraste maximal et zone blanche élargie pour une lecture fiable au téléphone.
            </p>
          </CardBody>
        </Card>
      </DashboardAnimate>

      <Card className="no-print">
        <CardBody className="flex items-start gap-3 text-sm text-slate-600">
          <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            En cas de perte, contactez votre structure. L&apos;ancienne carte sera désactivée avant émission d&apos;une
            nouvelle. Le QR ne contient aucune donnée personnelle.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
