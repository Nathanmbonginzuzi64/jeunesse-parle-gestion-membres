"use client";

import Link from "next/link";
import { Bell, CalendarCheck2, CalendarDays, CreditCard, IdCard, MessageSquare, Pencil, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Avatar } from "@/components/ui/avatar";
import { MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { DefinitionList } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { formatDate, cn } from "@/lib/utils";

export default function MemberSpacePage() {
  const { member, user } = useAuth();

  if (!member) {
    return (
      <Alert tone="info">
        Ce compte n&apos;est pas rattaché à un dossier membre. Contactez un administrateur.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour ${member.first_name} 👋`}
        description="Votre espace personnel Jeunesse Parle."
        actions={
          <Link href={`/membres/${member.id}?edit=1`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4" />
              Modifier mon profil
            </Button>
          </Link>
        }
      />

      <Card className="overflow-hidden border-brand-100">
        <CardBody className="relative flex flex-wrap items-center gap-5 bg-gradient-to-br from-brand-950 via-brand-900 to-slate-950 p-6 text-white">
          <Avatar src={member.photo_url} name={member.full_name} size="xl" rounded="lg" className="ring-2 ring-white/20" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{member.full_name}</p>
            <p className="font-mono text-sm text-gold-300">{member.member_code}</p>
            <div className="mt-2">
              <MemberStatusBadge status={member.status} label={member.status_label} />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className={cn(dashboardCardGrid, "sm:grid-cols-2 xl:grid-cols-4")}>
        <KpiCard label="Ma carte" value="QR" hint="Présenter ou imprimer" icon={CreditCard} tone="info" href="/ma-carte" />
        <KpiCard label="Activités" value="+" hint="S'inscrire et pointer" icon={CalendarDays} tone="neutral" href="/mon-espace/activites" />
        <KpiCard label="Présences" value="✓" hint="Historique des pointages" icon={CalendarCheck2} tone="success" href="/mon-espace/presences" />
        <KpiCard label="Structure" value={member.structure?.name ?? "—"} icon={IdCard} tone="neutral" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/ma-carte" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
          <CreditCard className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-sm font-medium">Ma carte</p>
          <p className="text-xs text-slate-500">QR agrandi pour scan agent</p>
        </Link>
        <Link href="/mon-espace/activites" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-sm font-medium">Mes activités</p>
          <p className="text-xs text-slate-500">Inscription + présence QR</p>
        </Link>
        <Link href="/mon-espace/presences" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
          <CalendarCheck2 className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-sm font-medium">Mes présences</p>
          <p className="text-xs text-slate-500">Historique de vos pointages</p>
        </Link>
        <Link href="/notifications" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
          <Bell className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-sm font-medium">Mes notifications</p>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
        <Link href="/jp-message" className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm">
          <MessageSquare className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-sm font-medium">JP Message</p>
          <p className="text-xs text-slate-500">Messagerie et dossiers officiels</p>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <p className="mt-2 text-sm font-medium">Province</p>
          <p className="text-xs text-slate-500">{member.province?.name ?? "—"}</p>
        </div>
      </div>

      <Card>
        <CardHeader title="Mon profil" />
        <CardBody>
          <DefinitionList
            columns={2}
            items={[
              { label: "Téléphone", value: member.phone ?? user?.phone },
              { label: "E-mail", value: member.email ?? user?.email },
              { label: "Province", value: member.province?.name },
              { label: "Ville", value: member.city?.name },
              { label: "Structure", value: member.structure?.name },
              { label: "Profession", value: member.profession },
              { label: "Adhésion", value: formatDate(member.joined_at) },
              { label: "Compétences", value: member.skills?.join(", ") },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
