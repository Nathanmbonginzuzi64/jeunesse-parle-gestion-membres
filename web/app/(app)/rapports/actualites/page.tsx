"use client";

import { Newspaper, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { NewsPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPageHeader } from "@/components/reports/report-page-header";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCompactCount } from "@/lib/utils";

interface NewsStats {
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
  top_viewed?: Array<{ id: number; title: string; views_count: number; likes_count: number }>;
  top_liked?: Array<{ id: number; title: string; likes_count: number; views_count: number }>;
  monthly_evolution?: Array<{ month: string; posts: number }>;
  most_active_users?: Array<{ member: string; comments: number }>;
}

export default function NewsReportPage() {
  return (
    <RequirePermission permission={PERMISSIONS.statisticsView}>
      <NewsReport />
    </RequirePermission>
  );
}

function NewsReport() {
  const { user } = useAuth();
  const { data, loading, error } = useApi<NewsStats>("/news/stats");

  const maxMonthly = data?.monthly_evolution?.length
    ? Math.max(...data.monthly_evolution.map((r) => r.posts), 1)
    : 1;

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/tableau-de-bord", label: "Pilotage" },
          { href: "/rapports", label: "Rapports" },
          { label: "Actualités" },
        ]}
      />

      <ReportPageHeader
        icon={Newspaper}
        title="Rapport JP Actualités"
        description="Engagement, vues et publications populaires."
        actions={
          <ReportPdfExportButton
            reportId="actualites"
            disabled={!data}
            onPrepare={async () => {
              if (!data) throw new Error("Données indisponibles.");
              return <NewsPdfDocument data={data} generatedBy={user?.name} />;
            }}
          />
        }
      />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <>
          <div className={dashboardCardGrid}>
            <KpiCard
              label="Publications"
              value={formatCompactCount(data.total_posts)}
              icon={Newspaper}
              tone="info"
            />
            <KpiCard
              label="Vues"
              value={formatCompactCount(data.total_views)}
              icon={Eye}
              tone="neutral"
            />
            <KpiCard
              label="Réactions"
              value={formatCompactCount(data.total_likes)}
              icon={Heart}
              tone="danger"
            />
            <KpiCard
              label="Commentaires"
              value={formatCompactCount(data.total_comments)}
              icon={MessageCircle}
              tone="success"
            />
            <KpiCard
              label="Partages"
              value={formatCompactCount(data.total_shares)}
              icon={Share2}
              tone="warning"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Publications les plus vues" />
              <CardBody className="divide-y divide-slate-100 p-0">
                {(data.top_viewed ?? data.top_posts).length === 0 ? (
                  <EmptyState title="Aucune publication" description="Pas encore de données." />
                ) : (
                  (data.top_viewed ?? data.top_posts).map((post, i) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium text-slate-900">{post.title}</span>
                      </div>
                      <span className="shrink-0 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
                        {formatCompactCount(post.views_count)} vues
                      </span>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Publications les plus aimées" />
              <CardBody className="divide-y divide-slate-100 p-0">
                {(data.top_liked ?? data.top_posts).length === 0 ? (
                  <EmptyState title="Aucune publication" description="Pas encore de données." />
                ) : (
                  (data.top_liked ?? data.top_posts).map((post, i) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium text-slate-900">{post.title}</span>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-rose-100">
                        <Heart className="h-3 w-3" />
                        {formatCompactCount(post.likes_count)}
                      </span>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>

          {data.most_active_users?.length ? (
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Membres les plus actifs (commentaires)" />
              <CardBody className="divide-y divide-slate-100 p-0">
                {data.most_active_users.map((row, i) => (
                  <div
                    key={`${row.member}-${i}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition hover:bg-slate-50/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                        {i + 1}
                      </span>
                      <span className="font-medium text-slate-900">{row.member}</span>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100">
                      {formatCompactCount(row.comments)} commentaires
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {data.monthly_evolution?.length ? (
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
              <CardHeader title="Évolution mensuelle des publications" />
              <CardBody>
                <div className="flex items-end gap-2 overflow-x-auto pb-1 sm:gap-3">
                  {data.monthly_evolution.map((row) => {
                    const heightPct = Math.max(8, Math.round((row.posts / maxMonthly) * 100));
                    return (
                      <div
                        key={row.month}
                        className="flex w-14 shrink-0 flex-col items-center gap-2 sm:w-16"
                      >
                        <span className="text-xs font-semibold text-brand-700">
                          {formatCompactCount(row.posts)}
                        </span>
                        <div className="flex h-28 w-full items-end rounded-lg bg-slate-50 p-1 ring-1 ring-slate-100">
                          <div
                            className="w-full rounded-md bg-gradient-to-t from-brand-700 to-brand-500 transition-all"
                            style={{ height: `${heightPct}%` }}
                            title={`${row.month}: ${row.posts}`}
                          />
                        </div>
                        <span className="text-center text-[10px] leading-tight text-slate-500">
                          {row.month}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
