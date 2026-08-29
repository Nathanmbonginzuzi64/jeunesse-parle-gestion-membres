"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/topbar";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import { MemberCardBack } from "@/components/cards/member-card-back";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { CardRender, MemberCard } from "@/lib/types";

export default function CardPreviewPage() {
  return (
    <RequirePermission permission={PERMISSIONS.cardsView}>
      <CardPreview />
    </RequirePermission>
  );
}

function CardPreview() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ data: MemberCard; render: CardRender }>(
    `/members/${params.id}/card`,
  );

  async function regenerate() {
    try {
      const response = await api.post<{ message: string }>(`/members/${params.id}/cards`);
      toast.success(response.message);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    }
  }

  if (loading) return <PageLoader label="Chargement de la carte…" />;
  if (error || !data?.render) return <Alert tone="error">{error ?? "Carte indisponible."}</Alert>;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/cartes", label: "Cartes" }, { label: "Aperçu" }]} />
      <PageHeader
        title="Aperçu carte membre"
        description={data.render.member_code}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Link href="/cartes">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
            <Can permission={PERMISSIONS.cardsIssue}>
              <Button onClick={() => void regenerate()}>
                <RefreshCw className="h-4 w-4" />
                Régénérer
              </Button>
            </Can>
          </div>
        }
      />

      <div id="member-card-print" className="mx-auto flex max-w-4xl flex-col items-center gap-8 print:gap-4">
        <MemberCardVisual render={data.render} />
        <MemberCardBack organization={data.render.organization} verificationUrl={data.render.verification_url} />
      </div>

      <Card className="no-print max-w-4xl mx-auto">
        <CardBody className="text-sm text-slate-600">
          <p>N° carte : <span className="font-mono">{data.data.card_number}</span></p>
          <p className="mt-1">Statut : {data.data.status_label}</p>
        </CardBody>
      </Card>
    </div>
  );
}
