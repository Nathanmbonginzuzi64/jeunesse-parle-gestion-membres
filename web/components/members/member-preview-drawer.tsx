"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Calendar,
  Copy,
  CreditCard,
  ExternalLink,
  Fingerprint,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Avatar } from "@/components/ui/avatar";
import { Badge, CardStatusBadge, MemberStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import type { Member, TimelineEvent } from "@/lib/types";
import { cn, formatDate, formatDateTime, formatShortDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface MemberShow {
  data: Member;
}

function PreviewSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex items-start gap-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function TerritoryPath({ member }: { member: Member }) {
  const parts = [
    member.province?.name,
    member.city?.name,
    member.commune?.name,
    member.zone?.name,
  ].filter(Boolean);

  if (!parts.length) {
    return <p className="text-sm text-slate-500">Territoire non renseigné</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-slate-700">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-slate-300">›</span>}
          <span className={cn(index === 0 && "font-medium text-slate-900")}>{part}</span>
        </span>
      ))}
    </div>
  );
}

export function MemberPreviewDrawer({
  member,
  onClose,
  onEdit,
}: {
  member: Member | null;
  onClose: () => void;
  onEdit?: (member: Member) => void;
}) {
  const toast = useToast();
  const memberId = member?.id ?? null;
  const detail = useApi<MemberShow>(memberId ? `/members/${memberId}` : null);
  const timeline = useApi<{ data: TimelineEvent[] }>(memberId ? `/members/${memberId}/timeline` : null);

  const profile = detail.data?.data ?? member;
  const loading = Boolean(memberId && detail.loading && !detail.data);
  const recentEvents = (timeline.data?.data ?? []).slice(0, 3);

  async function copyMemberCode() {
    if (!profile?.member_code) return;
    try {
      await navigator.clipboard.writeText(profile.member_code);
      toast.success("Identifiant copié.");
    } catch {
      toast.error("Copie impossible.");
    }
  }

  return (
    <Drawer
      open={Boolean(member)}
      onClose={onClose}
      side="right"
      className="max-w-lg"
      title=""
      header={
        <div className="relative shrink-0 border-b border-slate-100 bg-gradient-to-b from-brand-50/70 via-white to-white">
          <div className="flex h-1 w-full" aria-hidden>
            <span className="w-1/3 bg-flag-red" />
            <span className="w-1/3 bg-brand-600" />
            <span className="w-1/3 bg-flag-yellow" />
          </div>

          {loading && (
            <div className="px-5 py-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-20 w-20 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            </div>
          )}

          {profile && !loading && (
            <div className="px-5 py-4">
              <div className="flex items-start gap-4">
                <Avatar
                  src={profile.photo_url}
                  name={profile.full_name}
                  size="lg"
                  rounded="lg"
                  className="ring-2 ring-white shadow-sm"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold tracking-wide text-brand-600 uppercase">
                        Aperçu membre
                      </p>
                      <h2 className="mt-0.5 text-xl leading-tight font-bold text-slate-900">
                        {profile.full_name}
                      </h2>
                      <p className="mt-1 truncate text-sm font-medium text-slate-600">
                        {profile.structure?.name ?? "Sans structure"}
                        {profile.province?.name && (
                          <span className="font-normal text-slate-400"> · {profile.province.name}</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="shrink-0 text-slate-500 hover:bg-slate-100"
                      aria-label="Fermer"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => void copyMemberCode()}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-mono text-xs font-semibold text-brand-800 shadow-sm ring-1 ring-brand-100 transition hover:bg-brand-50"
                    title="Copier l'identifiant"
                  >
                    {profile.member_code}
                    <Copy className="h-3 w-3 opacity-50" />
                  </button>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <MemberStatusBadge status={profile.status} label={profile.status_label} />
                    {profile.card && (
                      <CardStatusBadge status={profile.card.status} label={profile.card.status_label} />
                    )}
                    {profile.fingerprint_enrolled && (
                      <Badge tone="success" className="gap-1">
                        <Fingerprint className="h-3 w-3" />
                        Biométrie
                      </Badge>
                    )}
                  </div>

                  {(profile.gender_label || profile.age || profile.profession) && (
                    <p className="mt-2 text-sm text-slate-500">
                      {[profile.gender_label, profile.age ? `${profile.age} ans` : null, profile.profession]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      }
      footer={
        profile && (
          <div className="flex w-full flex-wrap gap-2">
            {onEdit && (
              <Button variant="outline" className="flex-1" onClick={() => onEdit(profile)}>
                Modifier
              </Button>
            )}
            <Link href={`/membres/${profile.id}`} className="flex-1">
              <Button className="w-full">
                Dossier complet
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )
      }
    >
      {loading && <PreviewSkeleton />}

      {profile && !loading && (
        <div className="space-y-4 px-5 pb-5">
          {(profile.phone || profile.email) && (
            <div className="flex flex-wrap gap-2">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                >
                  <Phone className="h-4 w-4 text-brand-600" />
                  Appeler
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
                >
                  <Mail className="h-4 w-4 text-brand-600" />
                  E-mail
                </a>
              )}
            </div>
          )}

          <PreviewSection icon={MapPin} title="Territoire">
            <TerritoryPath member={profile} />
            {profile.address && (
              <p className="mt-2 text-sm text-slate-600">{profile.address}</p>
            )}
          </PreviewSection>

          <PreviewSection icon={Building2} title="Structure & rôle">
            <InfoRow label="Structure" value={profile.structure?.name ?? "Sans structure"} />
            <InfoRow label="Fonction" value={profile.position} />
            <InfoRow label="Adhésion" value={formatDate(profile.joined_at)} />
            <InfoRow label="Inscription" value={formatShortDate(profile.created_at)} />
          </PreviewSection>

          <PreviewSection icon={User} title="Contact">
            <InfoRow label="Téléphone" value={profile.phone ?? "—"} />
            <InfoRow label="Tél. secondaire" value={profile.phone_alt} />
            <InfoRow label="E-mail" value={profile.email} />
          </PreviewSection>

          {(profile.education_level || profile.activity_domain || profile.employment_status) && (
            <PreviewSection icon={Briefcase} title="Profil">
              <InfoRow label="Études" value={profile.education_level} />
              <InfoRow label="Situation" value={profile.employment_status} />
              <InfoRow label="Domaine" value={profile.activity_domain} />
            </PreviewSection>
          )}

          {profile.card && (
            <PreviewSection icon={CreditCard} title="Carte membre">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-slate-900">{profile.card.card_number}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Émise le {formatShortDate(profile.card.issued_at)}
                    {profile.card.expires_at && ` · expire le ${formatShortDate(profile.card.expires_at)}`}
                  </p>
                </div>
                <CardStatusBadge status={profile.card.status} label={profile.card.status_label} />
              </div>
            </PreviewSection>
          )}

          {Boolean(profile.skills?.length || profile.interests?.length) && (
            <PreviewSection icon={Briefcase} title="Compétences & intérêts">
              <div className="flex flex-wrap gap-1.5">
                {(profile.skills ?? []).map((skill) => (
                  <Badge key={`skill-${skill}`} tone="info">{skill}</Badge>
                ))}
                {(profile.interests ?? []).map((interest) => (
                  <Badge key={`interest-${interest}`}>{interest}</Badge>
                ))}
              </div>
            </PreviewSection>
          )}

          {recentEvents.length > 0 && (
            <PreviewSection icon={Calendar} title="Activité récente">
              <ul className="space-y-2">
                {recentEvents.map((event, index) => (
                  <li key={index} className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-sm font-medium text-slate-900">{event.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[event.detail, event.author, formatDateTime(event.at)].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </PreviewSection>
          )}

          {profile.status_reason && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <p className="font-medium">Motif du statut</p>
              <p className="mt-0.5 text-xs opacity-90">{profile.status_reason}</p>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
