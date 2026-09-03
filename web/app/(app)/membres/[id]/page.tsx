"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  Pencil,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/layout/topbar";
import { Can } from "@/components/auth/require-permission";
import { MemberCardPresentation } from "@/components/cards/member-card-presentation";
import { MemberCardVisual } from "@/components/members/member-card-visual";
import { MemberFormDialog } from "@/components/members/member-form-dialog";
import { Avatar } from "@/components/ui/avatar";
import { CardStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, PageLoader } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/field";
import { DefinitionList } from "@/components/ui/table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";
import type { CardRender, Member, MemberCard, MemberHistoryEntry, TimelineEvent } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

interface MemberShow {
  data: Member;
  history: MemberHistoryEntry[];
  cards: { data?: MemberCard[] } | MemberCard[];
}

export default function MemberShowPage() {
  return (
    <Suspense fallback={<PageLoader label="Chargement du dossier…" />}>
      <MemberShowContent />
    </Suspense>
  );
}

function MemberShowContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<MemberShow>(`/members/${params.id}`);
  const timeline = useApi<{ data: TimelineEvent[] }>(`/members/${params.id}/timeline`);
  const card = useApi<{ data: MemberCard; render: CardRender }>(`/members/${params.id}/card`);

  const [statusOpen, setStatusOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("profil");
  const [editOpen, setEditOpen] = useState(() => searchParams.get("edit") === "1");

  const member = data?.data;
  const cards = Array.isArray(data?.cards) ? data.cards : (data?.cards as { data?: MemberCard[] })?.data ?? [];

  async function changeStatus(status: string) {
    if (!member) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/members/${member.id}/status`, { status, reason });
      toast.success(response.message);
      setStatusOpen(null);
      setReason("");
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function validateMember() {
    if (!member) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/members/${member.id}/validate`);
      toast.success(response.message);
      reload();
      card.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Validation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function issueCard() {
    if (!member) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(`/members/${member.id}/card`, {});
      toast.success(response.message);
      reload();
      card.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Génération impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceCard() {
    if (!member || !member.card) return;
    setBusy(true);
    try {
      const response = await api.post<{ message: string }>(
        `/members/${member.id}/cards/${member.card.id}/revoke`,
        { status: "lost", reason: "Carte déclarée perdue", reissue: true },
      );
      toast.success(response.message);
      reload();
      card.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Remplacement impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !member) return <PageLoader />;
  if (error || !member) return <Alert tone="error">{error ?? "Membre introuvable."}</Alert>;

  return (
    <div>
      <Breadcrumb
        items={[
          { href: "/membres", label: "Membres" },
          { label: member.member_code },
        ]}
      />
      <div className="mb-4">
        <Link href="/membres" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Retour aux membres
        </Link>
      </div>
      <PageHeader
        title={member.full_name}
        description={member.member_code}
        actions={
          <div className="flex flex-wrap gap-2">
            <Can permission={PERMISSIONS.membersUpdate}>
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            </Can>
            <Can permission={PERMISSIONS.membersValidate}>
              {member.status === "pending" && (
                <Button onClick={() => void validateMember()} loading={busy}>
                  <CheckCircle2 className="h-4 w-4" />
                  Valider
                </Button>
              )}
            </Can>
            <Can permission={PERMISSIONS.cardsIssue}>
              <Button variant="outline" onClick={() => void issueCard()} loading={busy}>
                <CreditCard className="h-4 w-4" />
                Générer carte
              </Button>
            </Can>
            <Can permission={PERMISSIONS.membersChangeStatus}>
              {member.status === "active" && (
                <Button variant="outline" onClick={() => setStatusOpen("suspended")}>
                  <Ban className="h-4 w-4" /> Suspendre
                </Button>
              )}
              {member.status !== "archived" && (
                <Button variant="danger" onClick={() => setStatusOpen("archived")}>
                  <Archive className="h-4 w-4" /> Archiver
                </Button>
              )}
            </Can>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Avatar src={member.photo_url} name={member.full_name} size="xl" rounded="lg" />
        <div>
          <MemberStatusBadge status={member.status} label={member.status_label} />
          {member.card && (
            <span className="ml-2">
              <CardStatusBadge status={member.card.status} label={member.card.status_label} />
            </span>
          )}
          <p className="mt-1 text-sm text-slate-500">
            {member.structure?.name ?? "Sans structure"} · {member.province?.name}
          </p>
        </div>
      </div>

      <Tabs
        className="mt-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "profil", label: "Profil" },
          { id: "carte", label: "Carte" },
          { id: "activites", label: "Activités" },
          { id: "presences", label: "Présences" },
          { id: "historique", label: "Historique" },
        ]}
      />

      <TabPanel when="profil" active={tab}>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(24rem,0.95fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Identité" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: "Nom", value: member.last_name },
                  { label: "Postnom", value: member.middle_name },
                  { label: "Prénom", value: member.first_name },
                  { label: "Sexe", value: member.gender_label },
                  { label: "Âge", value: member.age },
                  { label: "Date de naissance", value: formatDate(member.birth_date) },
                  { label: "Lieu de naissance", value: member.birth_place },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Contact" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: "Téléphone", value: member.phone ?? "Masqué" },
                  { label: "Téléphone secondaire", value: member.phone_alt },
                  { label: "E-mail", value: member.email ?? "Masqué" },
                  { label: "Adresse", value: member.address },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Localisation & structure" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: "Province", value: member.province?.name },
                  { label: "Ville / Territoire", value: member.city?.name },
                  { label: "Commune / Secteur", value: member.commune?.name },
                  { label: "Quartier / Zone", value: member.zone?.name },
                  { label: "Structure", value: member.structure?.name },
                  { label: "Fonction", value: member.position },
                  { label: "Adhésion", value: formatDate(member.joined_at) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Profil" />
            <CardBody>
              <DefinitionList
                items={[
                  { label: "Études", value: member.education_level },
                  { label: "Profession", value: member.profession },
                  { label: "Situation", value: member.employment_status },
                  { label: "Domaine", value: member.activity_domain },
                  { label: "Compétences", value: member.skills?.join(", ") },
                  { label: "Centres d'intérêt", value: member.interests?.join(", ") },
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Carte & QR"
              description="Aperçu rapide de la carte active du membre."
              action={
                <Can permission={PERMISSIONS.cardsIssue}>
                  <Button size="sm" variant="secondary" onClick={() => void issueCard()} loading={busy}>
                    <CreditCard className="h-4 w-4" />
                    Générer
                  </Button>
                </Can>
              }
            />
            <CardBody>
              {card.data?.render ? (
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-brand-50/40 p-3 sm:p-4">
                  <MemberCardVisual render={card.data.render} className="mx-auto max-w-2xl" />
                </div>
              ) : (
                <EmptyState title="Aucune carte active" description="Validez le membre ou générez une carte." />
              )}
              <Can permission={PERMISSIONS.cardsRevoke}>
                {member.card?.is_valid && (
                  <Button variant="outline" className="mt-4 w-full" onClick={() => void replaceCard()}>
                    <RefreshCw className="h-4 w-4" />
                    Carte perdue — remplacer
                  </Button>
                )}
              </Can>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Actions" />
            <CardBody className="flex flex-col gap-2">
              <Can permission={PERMISSIONS.membersChangeStatus}>
                {member.status === "active" && (
                  <Button variant="outline" onClick={() => setStatusOpen("suspended")}>
                    <Ban className="h-4 w-4" /> Suspendre
                  </Button>
                )}
                {member.status === "suspended" && (
                  <Button variant="success" onClick={() => setStatusOpen("active")}>
                    <CheckCircle2 className="h-4 w-4" /> Réactiver
                  </Button>
                )}
                {member.status !== "inactive" && member.status !== "archived" && (
                  <Button variant="outline" onClick={() => setStatusOpen("inactive")}>
                    <ShieldAlert className="h-4 w-4" /> Désactiver
                  </Button>
                )}
                {member.status !== "archived" && (
                  <Button variant="danger" onClick={() => setStatusOpen("archived")}>
                    <Archive className="h-4 w-4" /> Archiver
                  </Button>
                )}
              </Can>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Historique des cartes" />
            <CardBody className="space-y-2">
              {cards.length === 0 && <p className="text-xs text-slate-500">Aucune carte émise.</p>}
              {cards.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{item.card_number}</span>
                  <CardStatusBadge status={item.status} label={item.status_label} />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
      </TabPanel>

      <TabPanel when="carte" active={tab}>
        <Card className="mt-6">
          <CardHeader title="Aperçu de la carte" description="Version agrandie et plus lisible de la carte générée." />
          <CardBody className="flex flex-col items-center gap-4">
            {card.data?.render ? (
              <div className="w-full rounded-3xl bg-gradient-to-br from-slate-50 via-white to-brand-50/40 p-4 sm:p-6">
                <MemberCardPresentation render={card.data.render} className="mx-auto max-w-5xl" />
              </div>
            ) : (
              <EmptyState title="Aucune carte active" description="Validez le membre ou générez une carte." />
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.print()}>Imprimer</Button>
              <Can permission={PERMISSIONS.cardsIssue}>
                <Button onClick={() => void issueCard()} loading={busy}>Générer</Button>
              </Can>
              <Can permission={PERMISSIONS.cardsRevoke}>
                {member.card?.is_valid && (
                  <Button variant="outline" onClick={() => void replaceCard()}>Régénérer</Button>
                )}
              </Can>
            </div>
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel when="activites" active={tab}>
        <Card className="mt-6">
          <CardBody>
            <EmptyState title="Aucune activité liée" description="Les participations apparaîtront ici." />
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel when="presences" active={tab}>
        <Card className="mt-6">
          <CardBody>
            <EmptyState title="Aucune présence enregistrée" description="Les pointages QR seront listés ici." />
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel when="historique" active={tab}>
      <Card className="mt-6">
        <CardHeader title="Historique" />
        <CardBody className="p-0">
          {(timeline.data?.data ?? []).length === 0 ? (
            <EmptyState title="Aucun événement" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(timeline.data?.data ?? []).map((event, index) => (
                <li key={index} className="px-5 py-3">
                  <p className="text-sm font-medium text-slate-900">{event.label}</p>
                  <p className="text-xs text-slate-500">
                    {event.detail}
                    {event.author ? ` · ${event.author}` : ""} · {formatDateTime(event.at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      </TabPanel>

      <MemberFormDialog
        open={editOpen}
        member={member}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          reload();
          card.reload();
        }}
      />

      <ConfirmDialog
        open={statusOpen !== null}
        onClose={() => setStatusOpen(null)}
        onConfirm={() => statusOpen && void changeStatus(statusOpen)}
        title="Confirmer le changement de statut"
        tone={statusOpen === "archived" || statusOpen === "suspended" ? "danger" : "primary"}
        loading={busy}
        message={
          <div className="space-y-3">
            <p>Le membre passera au statut « {statusOpen} ».</p>
            <Textarea
              label="Motif"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Raison de la décision"
            />
          </div>
        }
      />
    </div>
  );
}
