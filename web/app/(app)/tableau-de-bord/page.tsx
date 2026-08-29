"use client";

import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  CalendarPlus,
  CreditCard,
  IdCard,
  MapPin,
  Printer,
  QrCode,
  ScanLine,
  ShieldAlert,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardSection } from "@/components/dashboard/dashboard-section";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { DashboardWelcomeBanner } from "@/components/dashboard/dashboard-welcome-banner";
import { QuickLinkCard } from "@/components/dashboard/quick-link-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS, type PermissionSlug } from "@/lib/permissions";
import type { StatisticsCharts, StatisticsOverview } from "@/lib/types";
import { formatNumber, cn } from "@/lib/utils";

function buildScopeLabel(scope?: StatisticsOverview["scope"]) {
  if (!scope?.province) return "Échelle nationale";
  return [scope.province, scope.city, scope.structure].filter(Boolean).join(" · ");
}

function DashboardQuickActions({
  can,
}: {
  can: (permission: PermissionSlug) => boolean;
}) {
  return (
    <>
      {can(PERMISSIONS.membersCreate) && (
        <Link href="/membres">
          <Button size="sm" className="bg-white text-brand-700 hover:bg-brand-50">
            <UserPlus className="h-4 w-4" />
            Ajouter un membre
          </Button>
        </Link>
      )}
      {can(PERMISSIONS.cardsVerify) && (
        <Link href="/verification">
          <Button size="sm" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/15">
            <ScanLine className="h-4 w-4" />
            Vérifier
          </Button>
        </Link>
      )}
      {can(PERMISSIONS.activitiesManage) && (
        <Link href="/activites/nouveau">
          <Button size="sm" variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/15">
            <CalendarPlus className="h-4 w-4" />
            Activité
          </Button>
        </Link>
      )}
    </>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "#10b981",
  pending: "#f59e0b",
  inactive: "#64748b",
  suspended: "#ce1126",
  archived: "#94a3b8",
};

const PIE_FALLBACK = ["#0087d1", "#00649c", "#fad201", "#ce1126", "#64748b"];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-[var(--shadow-elevated)]">
      {label && <p className="mb-1 font-medium text-slate-700">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-slate-600">
          {entry.name} : <strong className="tabular-nums">{formatNumber(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-card" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 rounded-card xl:col-span-2" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { can, user, member, isMemberOnly } = useAuth();
  const statsEnabled = can(PERMISSIONS.statisticsView);
  const firstName =
    member?.first_name ?? user?.name?.split(" ")[0] ?? "Admin";

  const overview = useApi<StatisticsOverview>(statsEnabled ? "/statistics" : null);
  const charts = useApi<StatisticsCharts>(statsEnabled ? "/statistics/charts" : null);

  if (isMemberOnly) {
    return (
      <div>
        <DashboardWelcomeBanner
          firstName={firstName}
          subtitle="Voici votre espace personnel Jeunesse Parle."
          roleLabel={user?.role?.name}
          scopeLabel={member?.province?.name ?? "RDC"}
          chips={[
            { label: "Statut", value: member?.status_label ?? "—" },
            { label: "Identifiant", value: member?.member_code ?? "—" },
            { label: "Carte", value: member?.card?.status_label ?? "Non émise" },
          ]}
        />
        <DashboardAnimate delay={120}>
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-3")}>
            <KpiCard
              label="Mon statut"
              value={member?.status_label ?? "—"}
              icon={UserCheck}
              tone={member?.status === "active" ? "success" : "warning"}
            />
            <KpiCard label="Identifiant" value={member?.member_code ?? "—"} icon={Users} />
            <KpiCard
              label="Carte"
              value={member?.card?.status_label ?? "Non émise"}
              icon={CreditCard}
              tone={member?.card?.is_valid ? "success" : "neutral"}
            />
          </div>
        </DashboardAnimate>
        <DashboardAnimate delay={200} className="mt-6">
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2")}>
            <QuickLinkCard href="/ma-carte" icon={CreditCard} title="Ma carte" description="QR code et impression" tone="brand" />
            <QuickLinkCard href="/mon-espace" icon={Users} title="Mon profil" description="Informations personnelles" tone="emerald" />
          </div>
        </DashboardAnimate>
      </div>
    );
  }

  if (!statsEnabled) {
    return (
      <div>
        <DashboardWelcomeBanner
          firstName={firstName}
          subtitle="Accédez aux outils de vérification et de présence."
          roleLabel={user?.role?.name}
        />
        <DashboardAnimate delay={120}>
          <Alert tone="info">
            Accédez à la vérification des cartes et aux présences depuis le menu latéral.
          </Alert>
        </DashboardAnimate>
        <DashboardAnimate delay={200} className="mt-4">
          <div className={cn(dashboardCardGrid, "sm:grid-cols-2")}>
            <QuickLinkCard href="/verification" icon={ScanLine} title="Vérifier une carte" description="Scan ou saisie manuelle" tone="emerald" />
            <QuickLinkCard href="/presences" icon={Activity} title="Présences" description="Suivi des participations" tone="amber" />
          </div>
        </DashboardAnimate>
      </div>
    );
  }

  if (overview.loading && !overview.data) {
    return <DashboardSkeleton />;
  }

  if (overview.error) {
    return (
      <Alert tone="error" title="Impossible de charger le tableau de bord">
        {overview.error}
      </Alert>
    );
  }

  const kpis = overview.data?.kpis;
  const scope = overview.data?.scope;

  return (
    <div>
      <DashboardWelcomeBanner
        firstName={firstName}
        subtitle="Aperçu de Jeunesse Parle."
        roleLabel={scope?.role ?? user?.role?.name}
        scopeLabel={buildScopeLabel(scope)}
        chips={[
          { label: "Membres actifs", value: formatNumber(kpis?.members.active ?? 0) },
          { label: "En attente", value: formatNumber(kpis?.members.pending ?? 0) },
          { label: "Cartes actives", value: formatNumber(kpis?.cards.active ?? 0) },
        ]}
        actions={<DashboardQuickActions can={can} />}
      />

      <DashboardAnimate delay={80}>
      <DashboardSection
        icon={Users}
        title="Membres"
        description="Effectifs et répartition par statut"
        tone="brand"
        action={
          can(PERMISSIONS.membersView) ? (
            <Link href="/membres" className="text-xs font-medium text-brand-700 hover:underline">
              Voir la liste →
            </Link>
          ) : undefined
        }
      >
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6")}>
          <KpiCard
            label="Total membres"
            value={kpis?.members.total ?? 0}
            icon={Users}
            tone="info"
            href="/membres"
            hint="tous statuts"
          />
          <KpiCard
            label="Membres actifs"
            value={kpis?.members.active ?? 0}
            icon={UserCheck}
            tone="success"
            href="/membres?status=active"
          />
          <KpiCard
            label="En attente"
            value={kpis?.members.pending ?? 0}
            icon={UserPlus}
            tone="warning"
            href="/membres?status=pending"
          />
          <KpiCard
            label="Inactifs"
            value={kpis?.members.inactive ?? 0}
            icon={UserMinus}
            href="/membres?status=inactive"
          />
          <KpiCard
            label="Suspendus"
            value={kpis?.members.suspended ?? 0}
            icon={ShieldAlert}
            tone="danger"
            href="/membres?status=suspended"
          />
          <KpiCard
            label="Nouveaux membres"
            value={kpis?.members.new_this_month ?? 0}
            icon={UserPlus}
            tone="info"
            trend={`+${formatNumber(kpis?.members.new_last_30_days ?? 0)} / 30 j`}
          />
        </div>
      </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={160}>
      <DashboardSection
        className="mt-8"
        icon={IdCard}
        title="Cartes & identité"
        description="Émission, vérification et suivi des cartes JP-RDC"
        tone="emerald"
        action={
          can(PERMISSIONS.cardsView) ? (
            <Link href="/cartes" className="text-xs font-medium text-brand-700 hover:underline">
              Gérer les cartes →
            </Link>
          ) : undefined
        }
      >
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard
            label="Cartes actives"
            value={kpis?.cards.active ?? 0}
            icon={BadgeCheck}
            tone="success"
            href="/cartes?status=active"
          />
          <KpiCard
            label="Émises ce mois"
            value={kpis?.cards.issued_this_month ?? 0}
            icon={CreditCard}
            tone="info"
            href="/cartes"
          />
          <KpiCard
            label="Vérifications (30 j)"
            value={kpis?.verifications.last_30_days ?? 0}
            icon={ScanLine}
            tone="neutral"
            href="/verification"
          />
          <KpiCard
            label="Activités à venir"
            value={kpis?.activities.upcoming ?? 0}
            icon={Activity}
            tone="warning"
            href="/activites"
            hint={`${formatNumber(kpis?.coverage.structures ?? 0)} structures`}
          />
        </div>

        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 xl:grid-cols-4")}>
          {can(PERMISSIONS.cardsView) && (
            <QuickLinkCard
              href="/cartes"
              icon={IdCard}
              title="Liste des cartes"
              description="Actives, expirées, suspendues"
              tone="brand"
            />
          )}
          {can(PERMISSIONS.cardsVerify) && (
            <QuickLinkCard
              href="/verification"
              icon={ScanLine}
              title="Vérifier un membre"
              description="Scan ou saisie JP-RDC"
              tone="emerald"
            />
          )}
          {can(PERMISSIONS.cardsVerify) && (
            <QuickLinkCard
              href="/scan"
              icon={QrCode}
              title="Scan de présence"
              description="QR code lors des activités"
              tone="amber"
            />
          )}
          {can(PERMISSIONS.cardsView) && (
            <QuickLinkCard
              href="/cartes?status=active"
              icon={Printer}
              title="Impression"
              description="Aperçu et export des cartes"
              tone="slate"
            />
          )}
        </div>
      </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={240}>
      <DashboardSection
        className="mt-8"
        icon={MapPin}
        title="Couverture territoriale"
        description="Présence sur le territoire national"
        tone="slate"
        action={
          can(PERMISSIONS.mapView) ? (
            <Link href="/cartographie" className="text-xs font-medium text-brand-700 hover:underline">
              Cartographie →
            </Link>
          ) : undefined
        }
      >
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard label="Provinces" value={kpis?.coverage.provinces ?? 0} icon={MapPin} tone="info" href="/structures" />
          <KpiCard label="Villes" value={kpis?.coverage.cities ?? 0} icon={MapPin} href="/structures" />
          <KpiCard label="Structures" value={kpis?.coverage.structures ?? 0} icon={Users} href="/structures" />
          <KpiCard
            label="Activités totales"
            value={kpis?.activities.total ?? 0}
            icon={Activity}
            href="/activites"
          />
        </div>
      </DashboardSection>
      </DashboardAnimate>

      <DashboardAnimate delay={320}>
      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Évolution des membres" description="Inscriptions sur 12 mois" />
          <CardBody className="h-80">
            {charts.loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.data?.registrations_trend ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Inscriptions"
                    stroke="#0087d1"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Membres par statut" />
          <CardBody className="h-80">
            {charts.loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.data?.by_status ?? []}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={86}
                    paddingAngle={2}
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {(charts.data?.by_status ?? []).map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key] ?? PIE_FALLBACK[index % PIE_FALLBACK.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <ul className="-mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 px-1 text-[11px]">
              {(charts.data?.by_status ?? []).map((entry) => (
                <li key={entry.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: STATUS_COLORS[entry.key] ?? "#0087d1" }}
                    />
                    {entry.label}
                  </span>
                  <span className="tabular-nums font-medium text-slate-800">{formatNumber(entry.total)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
      </DashboardAnimate>

      <DashboardAnimate delay={400}>
      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader title="Membres par province" description="Top 8" />
          <CardBody className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(charts.data?.by_province ?? []).slice(0, 8)} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#334155" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Membres" fill="#0087d1" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Par profession" />
          <CardBody className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data?.by_profession ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f4" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#667085" }} interval={0} angle={-18} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Membres" fill="#00649c" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Compétences"
            description="Les plus déclarées"
            action={
              <Link href="/statistiques" className="text-xs font-medium text-brand-700 hover:underline">
                Lire la suite
              </Link>
            }
          />
          <CardBody className="space-y-3">
            {(charts.data?.top_skills ?? []).slice(0, 5).map((skill) => {
              const max = charts.data?.top_skills[0]?.total ?? 1;
              return (
                <div key={skill.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-700">{skill.label}</span>
                    <span className="tabular-nums text-slate-500">{formatNumber(skill.total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${Math.round((skill.total / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
      </DashboardAnimate>

      <DashboardAnimate delay={480}>
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Activité récente"
            description="Inscriptions, validations, cartes et vérifications"
            action={
              <Link href="/audit" className="text-xs font-medium text-brand-700 hover:underline">
                Lire la suite
              </Link>
            }
          />
          <CardBody className="p-0">
            {(overview.data?.recent ?? []).length === 0 ? (
              <EmptyState title="Aucune activité récente" />
            ) : (
              <RecentActivity items={(overview.data?.recent ?? []).slice(0, 5)} />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Couverture" description="Synthèse territoriale" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] text-slate-500">Provinces</p>
                  <p className="text-lg font-semibold tabular-nums">{formatNumber(kpis?.coverage.provinces ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] text-slate-500">Villes</p>
                  <p className="text-lg font-semibold tabular-nums">{formatNumber(kpis?.coverage.cities ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <Users className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] text-slate-500">Structures</p>
                  <p className="text-lg font-semibold tabular-nums">{formatNumber(kpis?.coverage.structures ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                  <IdCard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[11px] text-slate-500">Cartes ce mois</p>
                  <p className="text-lg font-semibold tabular-nums">{formatNumber(kpis?.cards.issued_this_month ?? 0)}</p>
                </div>
              </div>
            </div>
            {can(PERMISSIONS.mapView) && (
              <Link
                href="/cartographie"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700"
              >
                <MapPin className="h-4 w-4" />
                Ouvrir la cartographie
              </Link>
            )}
          </CardBody>
        </Card>
      </div>
      </DashboardAnimate>
    </div>
  );
}
