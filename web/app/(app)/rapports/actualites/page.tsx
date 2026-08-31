"use client";

import { Newspaper, Eye, Heart, MessageCircle, Share2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { NewsPdfDocument } from "@/components/reports/analytics-pdf-document";
import { ReportPdfExportButton } from "@/components/reports/report-pdf-export-button";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";

interface NewsStats {
  total_posts: number;
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  top_posts: Array<{ id: number; title: string; likes_count: number; views_count: number; comments_count: number }>;
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

  return (
    <>
      <Breadcrumb items={[{ href: "/rapports", label: "Rapports" }, { label: "Actualités" }]} />

      <DashboardAnimate>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Rapport JP Actualités</h1>
            <p className="mt-1 text-sm text-slate-600">Engagement, vues et publications populaires</p>
          </div>
          <ReportPdfExportButton
            reportId="actualites"
            disabled={!data}
            onPrepare={async () => {
              if (!data) throw new Error("Données indisponibles.");
              return <NewsPdfDocument data={data} generatedBy={user?.name} />;
            }}
          />
        </div>
      </DashboardAnimate>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : (
        <>
          <div className={`${dashboardCardGrid} mt-4`}>
            <KpiCard label="Publications" value={formatNumber(data.total_posts)} icon={Newspaper} />
            <KpiCard label="Vues" value={formatNumber(data.total_views)} icon={Eye} />
            <KpiCard label="Réactions" value={formatNumber(data.total_likes)} icon={Heart} />
            <KpiCard label="Commentaires" value={formatNumber(data.total_comments)} icon={MessageCircle} />
            <KpiCard label="Partages" value={formatNumber(data.total_shares)} icon={Share2} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Publication la plus vue" />
              <CardBody className="divide-y divide-slate-100 p-0">
                {(data.top_viewed ?? data.top_posts).map((post) => (
                  <div key={post.id} className="flex justify-between px-4 py-3 text-sm">
                    <span className="font-medium">{post.title}</span>
                    <span className="text-slate-500">{formatNumber(post.views_count)} vues</span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Publication la plus aimée" />
              <CardBody className="divide-y divide-slate-100 p-0">
                {(data.top_liked ?? data.top_posts).map((post) => (
                  <div key={post.id} className="flex justify-between px-4 py-3 text-sm">
                    <span className="font-medium">{post.title}</span>
                    <span className="text-slate-500">{formatNumber(post.likes_count)} ♥</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>

          {data.most_active_users?.length ? (
            <Card className="mt-4">
              <CardHeader title="Membres les plus actifs (commentaires)" />
              <CardBody className="divide-y divide-slate-100 p-0">
                {data.most_active_users.map((row, i) => (
                  <div key={i} className="flex justify-between px-4 py-3 text-sm">
                    <span>{row.member}</span>
                    <span className="text-slate-500">{row.comments} commentaires</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {data.monthly_evolution?.length ? (
            <Card className="mt-4">
              <CardHeader title="Évolution mensuelle des publications" />
              <CardBody>
                <div className="flex flex-wrap gap-3">
                  {data.monthly_evolution.map((row) => (
                    <div key={row.month} className="rounded-xl bg-brand-50 px-4 py-3 text-center">
                      <p className="text-xs text-slate-500">{row.month}</p>
                      <p className="text-lg font-semibold text-brand-700">{row.posts}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
