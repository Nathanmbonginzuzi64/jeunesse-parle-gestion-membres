"use client";

/* eslint-disable @next/next/no-img-element */

import type {
  ActivitiesReportResponse,
  AttendanceReportResponse,
  CardsReportResponse,
  MemberProfileReport,
  MemberReportRow,
  MembersReportResponse,
  ReportFiltersState,
  RolesReportResponse,
  UsersReportResponse,
} from "@/lib/reports/api-types";
import { formatDateLong } from "@/lib/datetime";
import { formatDateTime, formatNumber } from "@/lib/utils";
import {
  chunkRows,
  ReportPdfKpiGrid,
  ReportPdfPage,
  ReportPdfSignatureBlock,
  ReportPdfSummary,
  ReportPdfTable,
  type ReportPdfMeta,
} from "./report-pdf-layout";

interface NewsStatsPayload {
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  top_posts: Array<{
    id: number;
    title: string;
    likes_count: number;
    views_count: number;
    comments_count: number;
  }>;
}

function baseMeta(
  title: string,
  subtitle: string,
  generatedBy?: string,
  filters?: Partial<ReportFiltersState>,
  scope?: string,
): ReportPdfMeta {
  return {
    title,
    subtitle,
    generatedAt: new Date().toISOString(),
    generatedBy,
    filters,
    scope,
  };
}

export function MembersListPdfDocument({
  data,
  generatedBy,
  filters,
}: {
  data: MembersReportResponse;
  generatedBy?: string;
  filters?: Partial<ReportFiltersState>;
}) {
  const meta = baseMeta(
    "Rapport des membres",
    "Liste par localisation — Province → Avenue",
    generatedBy,
    filters,
  );
  const rows = data.data.map((row) => [
    row.full_name,
    row.member_code,
    [row.province, row.city, row.district, row.commune, row.quartier, row.avenue].filter(Boolean).join(" › ") || "—",
    row.structure ?? "—",
    row.joined_at ?? row.created_at?.slice(0, 10) ?? "—",
    row.status_label,
    row.card_status_label ?? "—",
    row.biometric_enrolled ? "Oui" : "Non",
  ]);
  const chunks = chunkRows(rows, 20);
  const total = chunks.length + 1;

  return (
    <>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Synthèse" }} page={1} total={total}>
        <section className="space-y-5">
          <ReportPdfSummary>
            Ce rapport recense <strong>{formatNumber(data.meta.total)}</strong> membre(s) correspondant aux
            critères sélectionnés. Document généré le {formatDateLong(new Date(data.generated_at))}.
          </ReportPdfSummary>
          <ReportPdfKpiGrid
            items={[
              { label: "Total membres", value: data.meta.total },
              { label: "Page courante", value: `${data.meta.current_page}/${data.meta.last_page}` },
              { label: "Actifs (page)", value: data.data.filter((m) => m.status === "active").length },
              { label: "Biométrie (page)", value: data.data.filter((m) => m.biometric_enrolled).length },
            ]}
          />
          {chunks[0]?.length ? (
            <ReportPdfTable
              title={`Membres (1/${chunks.length})`}
              headers={["Nom", "Code", "Localisation", "Structure", "Inscription", "Statut", "Carte", "Bio."]}
              rows={chunks[0]!}
              compact
            />
          ) : null}
        </section>
      </ReportPdfPage>
      {chunks.slice(1).map((chunk, index) => (
        <ReportPdfPage
          key={index}
          meta={{ ...meta, pageLabel: `Liste membres (${index + 2}/${chunks.length})` }}
          page={index + 2}
          total={total}
        >
          <ReportPdfTable
            title={`Membres (${index + 2}/${chunks.length})`}
            headers={["Nom", "Code", "Localisation", "Structure", "Inscription", "Statut", "Carte", "Bio."]}
            rows={chunk}
            compact
          />
        </ReportPdfPage>
      ))}
      <ReportPdfPage meta={{ ...meta, pageLabel: "Validation" }} page={total} total={total}>
        <ReportPdfSignatureBlock />
      </ReportPdfPage>
    </>
  );
}

export function MemberProfilePdfDocument({
  data,
  generatedBy,
}: {
  data: MemberProfileReport;
  generatedBy?: string;
}) {
  const meta = baseMeta(
    `Profil membre — ${data.member.full_name}`,
    data.member.member_code,
    generatedBy,
  );
  const m = data.member;

  return (
    <>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Identité & indicateurs" }} page={1} total={2}>
        <section className="space-y-5">
          <ReportPdfKpiGrid
            items={[
              { label: "Activités", value: data.summary.activities_count },
              { label: "Présences", value: `${data.summary.attendances_present}/${data.summary.attendances_total}` },
              {
                label: "Taux participation",
                value: data.summary.participation_rate !== null ? `${data.summary.participation_rate}%` : "—",
              },
              { label: "Statut", value: m.status_label },
            ]}
          />
          <ReportPdfTable
            title="Informations personnelles"
            headers={["Champ", "Valeur"]}
            rows={[
              ["Nom complet", m.full_name],
              ["Code membre", m.member_code],
              ["Sexe", m.gender_label ?? "—"],
              ["Date naissance", m.birth_date ?? "—"],
              ["Profession", data.profile.profession ?? "—"],
              ["Formation", data.profile.education_level ?? "—"],
              ["Structure", m.structure ?? "—"],
              [
                "Localisation",
                [m.province, m.city, m.commune, m.quartier, m.avenue].filter(Boolean).join(" › ") || "—",
              ],
            ]}
          />
          <ReportPdfTable
            title="Jeunesse Parle"
            headers={["Champ", "Valeur"]}
            rows={[
              ["Carte", `${m.card_status_label ?? "—"}${m.card_number ? ` (${m.card_number})` : ""}`],
              ["Biométrie", m.biometric_enrolled ? "Activée" : "Non enregistrée"],
              ["Inscription", m.joined_at ?? "—"],
              ["Compétences", data.profile.skills.join(", ") || "—"],
            ]}
          />
        </section>
      </ReportPdfPage>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Historique" }} page={2} total={2}>
        <section className="space-y-5">
          <ReportPdfTable
            title="Activités"
            headers={["Titre", "Type", "Date", "Lieu"]}
            rows={data.activities.map((a) => [
              a.title,
              a.type_label,
              a.starts_at ? formatDateTime(a.starts_at) : "—",
              a.location ?? "—",
            ])}
          />
          <ReportPdfTable
            title="Présences récentes"
            headers={["Activité", "Date", "Méthode", "Statut"]}
            rows={data.attendances.slice(0, 30).map((r) => [
              r.activity ?? "—",
              r.date ?? "—",
              r.method ?? "—",
              r.status_label,
            ])}
          />
          <ReportPdfSignatureBlock />
        </section>
      </ReportPdfPage>
    </>
  );
}

export function ActivitiesPdfDocument({
  data,
  generatedBy,
  filters,
}: {
  data: ActivitiesReportResponse;
  generatedBy?: string;
  filters?: Partial<ReportFiltersState>;
}) {
  const meta = baseMeta("Rapport des activités", "Participants et présences par activité", generatedBy, filters);
  const rows = data.data.map((row) => [
    row.title,
    row.code,
    row.type_label,
    row.starts_at ? formatDateTime(row.starts_at) : "—",
    row.location ?? "—",
    [row.province, row.city, row.commune].filter(Boolean).join(" › ") || "—",
    row.participants_count,
    row.attendances_count,
    row.organizer ?? "—",
  ]);
  const chunks = chunkRows(rows, 18);
  const total = chunks.length + 1;

  return (
    <>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Vue d'ensemble" }} page={1} total={total}>
        <section className="space-y-5">
          <ReportPdfSummary>
            <strong>{formatNumber(data.meta.total)}</strong> activité(s) recensée(s) selon les filtres appliqués.
          </ReportPdfSummary>
          <ReportPdfKpiGrid
            items={[
              { label: "Total activités", value: data.meta.total },
              { label: "Participants (page)", value: data.data.reduce((s, r) => s + r.participants_count, 0) },
              { label: "Présences (page)", value: data.data.reduce((s, r) => s + r.attendances_count, 0) },
              { label: "Types distincts", value: new Set(data.data.map((r) => r.type)).size },
            ]}
          />
          {chunks[0]?.length ? (
            <ReportPdfTable
              title="Activités"
              headers={["Titre", "Code", "Type", "Date", "Lieu", "Territoire", "Part.", "Prés.", "Organisateur"]}
              rows={chunks[0]!}
              compact
            />
          ) : null}
        </section>
      </ReportPdfPage>
      {chunks.slice(1).map((chunk, i) => (
        <ReportPdfPage key={i} meta={{ ...meta, pageLabel: `Activités (suite ${i + 2})` }} page={i + 2} total={total}>
          <ReportPdfTable
            title="Activités (suite)"
            headers={["Titre", "Code", "Type", "Date", "Lieu", "Territoire", "Part.", "Prés.", "Organisateur"]}
            rows={chunk}
            compact
          />
        </ReportPdfPage>
      ))}
      <ReportPdfPage meta={{ ...meta, pageLabel: "Validation" }} page={total} total={total}>
        <ReportPdfSignatureBlock />
      </ReportPdfPage>
    </>
  );
}

export function CardsPdfDocument({
  data,
  generatedBy,
}: {
  data: CardsReportResponse;
  generatedBy?: string;
}) {
  const meta = baseMeta("Rapport des cartes membres", "Statuts, émissions et expirations", generatedBy);
  const s = data.summary;
  const rows = data.data.map((row) => [
    row.member?.full_name ?? "—",
    row.member?.member_code ?? "—",
    row.card_number,
    row.issued_at ?? "—",
    row.expires_at ?? "—",
    row.status_label,
  ]);
  const chunks = chunkRows(rows, 22);
  const total = chunks.length + 1;

  return (
    <>
      <ReportPdfPage meta={{ ...meta, pageLabel: "Indicateurs globaux" }} page={1} total={total}>
        <section className="space-y-5">
          <ReportPdfKpiGrid
            items={[
              { label: "Total", value: s.total },
              { label: "Actives", value: s.active },
              { label: "Expirées", value: s.expired },
              { label: "Suspendues", value: s.suspended },
              { label: "Perdues", value: s.lost },
              { label: "Remplacées", value: s.replaced },
              { label: "Inactives", value: s.inactive },
              { label: "Taux actives", value: s.total ? `${Math.round((s.active / s.total) * 100)}%` : "—" },
            ]}
          />
          {chunks[0]?.length ? (
            <ReportPdfTable
              title="Détail par membre"
              headers={["Membre", "Code", "N° carte", "Émission", "Expiration", "Statut"]}
              rows={chunks[0]!}
              compact
            />
          ) : null}
        </section>
      </ReportPdfPage>
      {chunks.slice(1).map((chunk, i) => (
        <ReportPdfPage key={i} meta={{ ...meta, pageLabel: `Cartes (suite ${i + 2})` }} page={i + 2} total={total}>
          <ReportPdfTable
            title="Détail par membre (suite)"
            headers={["Membre", "Code", "N° carte", "Émission", "Expiration", "Statut"]}
            rows={chunk}
            compact
          />
        </ReportPdfPage>
      ))}
      <ReportPdfPage meta={{ ...meta, pageLabel: "Validation" }} page={total} total={total}>
        <ReportPdfSignatureBlock />
      </ReportPdfPage>
    </>
  );
}

export function AttendancePdfDocument({
  data,
  generatedBy,
  filters,
}: {
  data: AttendanceReportResponse;
  generatedBy?: string;
  filters?: Partial<ReportFiltersState>;
}) {
  const meta = baseMeta("Rapport des présences", "Participation globale et par type d'activité", generatedBy, filters);
  const g = data.global;

  return (
    <ReportPdfPage meta={{ ...meta, pageLabel: "Analyse de participation" }} page={1} total={1}>
      <section className="space-y-5">
        <ReportPdfSummary>
          Sur <strong>{formatNumber(g.active_members)}</strong> membres actifs,{" "}
          <strong>{formatNumber(g.present)}</strong> présences confirmées sur{" "}
          <strong>{formatNumber(g.total_records)}</strong> enregistrements — taux global{" "}
          <strong>{g.participation_rate}%</strong>.
        </ReportPdfSummary>
        <ReportPdfKpiGrid
          items={[
            { label: "Membres actifs", value: g.active_members },
            { label: "Enregistrements", value: g.total_records },
            { label: "Présents", value: g.present },
            { label: "Absents", value: g.absent },
          ]}
        />
        <ReportPdfTable
          title="Par type d'activité"
          headers={["Type", "Activités", "Présences", "Présents", "Taux"]}
          rows={data.by_activity_type.map((row) => [
            row.type_label,
            row.activities_count,
            row.attendances_count,
            row.present_count,
            `${row.rate}%`,
          ])}
        />
        <ReportPdfSignatureBlock />
      </section>
    </ReportPdfPage>
  );
}

export function UsersPdfDocument({
  data,
  generatedBy,
}: {
  data: UsersReportResponse;
  generatedBy?: string;
}) {
  const meta = baseMeta("Rapport utilisateurs système", "Comptes, rôles et connexions", generatedBy);

  return (
    <ReportPdfPage meta={{ ...meta, pageLabel: "Administration" }} page={1} total={1}>
      <section className="space-y-5">
        <ReportPdfKpiGrid
          items={[
            { label: "Total comptes", value: data.summary.total },
            { label: "Actifs", value: data.summary.active },
            { label: "Suspendus", value: data.summary.suspended },
            { label: "Rôles", value: data.by_role.length },
          ]}
        />
        <ReportPdfTable
          title="Répartition par rôle"
          headers={["Rôle", "Effectif"]}
          rows={data.by_role.map((r) => [r.role, r.total])}
        />
        <ReportPdfTable
          title="Dernières connexions"
          headers={["Utilisateur", "Rôle", "E-mail", "Statut", "Dernière connexion"]}
          rows={data.recent.map((u) => [
            u.name,
            u.role ?? "—",
            u.email,
            u.is_active ? "Actif" : "Suspendu",
            u.last_login_at ? formatDateTime(u.last_login_at) : "Jamais",
          ])}
          compact
        />
        <ReportPdfSignatureBlock />
      </section>
    </ReportPdfPage>
  );
}

export function RolesPdfDocument({
  data,
  generatedBy,
}: {
  data: RolesReportResponse;
  generatedBy?: string;
}) {
  const meta = baseMeta("Rôles & permissions (RBAC)", "Matrice des droits par rôle", generatedBy);
  if (data.data.length === 0) {
    return (
      <ReportPdfPage meta={meta} page={1} total={1}>
        <p className="text-sm text-slate-500">Aucun rôle configuré.</p>
      </ReportPdfPage>
    );
  }
  const pages = data.data.length;

  return (
    <>
      {data.data.map((role, index) => (
        <ReportPdfPage
          key={role.id}
          meta={{ ...meta, pageLabel: role.name }}
          page={index + 1}
          total={pages}
        >
          <section className="space-y-4">
            <ReportPdfSummary>
              <strong>{role.name}</strong>
              {role.description ? ` — ${role.description}` : ""}. Niveau de scope : {role.scope_level} ·{" "}
              {formatNumber(role.users_count)} utilisateur(s).
            </ReportPdfSummary>
            <ReportPdfTable
              title="Permissions accordées"
              headers={["Permission", "Module"]}
              rows={role.permissions.map((p) => [p.name, p.module ?? "—"])}
            />
            {index === data.data.length - 1 ? <ReportPdfSignatureBlock /> : null}
          </section>
        </ReportPdfPage>
      ))}
    </>
  );
}

export function NewsPdfDocument({
  data,
  generatedBy,
}: {
  data: NewsStatsPayload;
  generatedBy?: string;
}) {
  const meta = baseMeta("Rapport JP Actualités", "Engagement et publications populaires", generatedBy);

  return (
    <ReportPdfPage meta={{ ...meta, pageLabel: "Indicateurs d'engagement" }} page={1} total={1}>
      <section className="space-y-5">
        <ReportPdfKpiGrid
          items={[
            { label: "Publications", value: data.total_posts },
            { label: "Vues", value: data.total_views },
            { label: "J'aime", value: data.total_likes },
            { label: "Commentaires", value: data.total_comments },
            { label: "Partages", value: data.total_shares },
            {
              label: "Engagement moyen",
              value: data.total_posts
                ? formatNumber(Math.round((data.total_likes + data.total_comments) / data.total_posts))
                : "0",
            },
            { label: "Vues / publication", value: data.total_posts ? Math.round(data.total_views / data.total_posts) : 0 },
            { label: "Top posts", value: data.top_posts.length },
          ]}
        />
        <ReportPdfTable
          title="Publications les plus populaires"
          headers={["Titre", "J'aime", "Commentaires", "Vues"]}
          rows={data.top_posts.map((p) => [p.title, p.likes_count, p.comments_count, p.views_count])}
        />
        <ReportPdfSignatureBlock />
      </section>
    </ReportPdfPage>
  );
}

export type { MemberReportRow };
