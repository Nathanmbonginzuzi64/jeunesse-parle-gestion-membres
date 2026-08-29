"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer, RefreshCw } from "lucide-react";
import { useParams } from "next/navigation";
import { MemberCardPresentation } from "@/components/cards/member-card-presentation";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { PageHeader } from "@/components/layout/topbar";
import { Can, RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CardMeta } from "@/components/members/member-card-visual";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { CardRender, MemberCard } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

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
      <div className="no-print space-y-6">
        <Breadcrumb items={[{ href: "/cartes", label: "Cartes" }, { label: "Aperçu" }]} />
        <PageHeader
          title="Présentation carte membre"
          description={`${data.render.full_name} · ${data.render.member_code}`}
          actions={
            <div className="flex flex-wrap gap-2">
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
      </div>

      <DashboardAnimate>
        <div
          id="member-card-print"
          className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100 via-slate-50 to-white p-4 shadow-[var(--shadow-card)] sm:p-6 lg:p-8"
        >
          <MemberCardPresentation render={data.render} />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={80}>
        <Card className="no-print mx-auto max-w-5xl">
          <CardHeader
            title="Métadonnées"
            description="Informations techniques de la carte émise"
            action={<CardMeta status={data.data.status} statusLabel={data.data.status_label} valid={data.data.is_valid} />}
          />
          <CardBody className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
            <p>
              N° carte : <span className="font-mono font-medium text-slate-900">{data.data.card_number}</span>
            </p>
            <p>
              Émise le : <span className="font-medium text-slate-900">{formatShortDate(data.data.issued_at)}</span>
            </p>
            <p>
              Expire le : <span className="font-medium text-slate-900">{formatShortDate(data.data.expires_at)}</span>
            </p>
          </CardBody>
        </Card>
      </DashboardAnimate>
    </div>
  );
}
