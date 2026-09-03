"use client";

import { Download, Printer } from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { MemberCardPresentation } from "@/components/cards/member-card-presentation";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import type { CardRender, MemberCard } from "@/lib/types";

export default function ParametresMaCartePage() {
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
            ? "Votre dossier est en attente de validation."
            : (error ?? "Aucune carte active.")
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Afficher / imprimer
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          Télécharger
        </Button>
      </div>
      <DashboardAnimate>
        <MemberCardPresentation render={data.render} />
      </DashboardAnimate>
    </div>
  );
}
