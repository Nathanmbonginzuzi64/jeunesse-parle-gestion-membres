"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Heart, MessageCircle, Newspaper, Plus, Share2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { NewsAdminDetailModal } from "@/components/news/news-admin-detail-modal";
import { NewsAdminTable } from "@/components/news/news-admin-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { api, ApiError } from "@/lib/api";
import { useApi, useDebounced } from "@/lib/hooks";
import type { NewsPostItem } from "@/lib/news/constants";
import { PERMISSIONS } from "@/lib/permissions";
import { formatNumber } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface ManageResponse {
  data: NewsPostItem[];
  summary: {
    total_posts: number;
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_shares: number;
  };
}

export default function ActualitesGestionPage() {
  return (
    <RequirePermission permission={[PERMISSIONS.activitiesManage, PERMISSIONS.notificationsSend]}>
      <ActualitesAdmin />
    </RequirePermission>
  );
}

function ActualitesAdmin() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [detailPost, setDetailPost] = useState<NewsPostItem | null>(null);
  const debouncedSearch = useDebounced(search, 350);
  const { data, loading, error, reload } = useApi<ManageResponse>("/news/manage", {
    per_page: 50,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  });

  async function archive(id: number) {
    if (!window.confirm("Archiver cette actualité ?")) return;
    try {
      await api.delete(`/news/${id}`);
      toast.success("Actualité archivée.");
      setDetailPost(null);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Action impossible.");
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <Breadcrumb items={[{ href: "/actualites", label: "Actualités" }, { label: "Administration" }]} />

      <DashboardAnimate>
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                <Newspaper className="h-7 w-7" />
              </span>
              <div>
                <p className="text-sm text-brand-100">Jeunesse Parle 🇨🇩</p>
                <h1 className="text-2xl font-bold">Administration des actualités</h1>
                <p className="mt-1 text-sm text-brand-100/90">Publiez, analysez et gérez le fil d&apos;information</p>
              </div>
            </div>
            <Button
              onClick={() => router.push("/actualites/gestion/create")}
              className="bg-white text-brand-700 hover:bg-brand-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle actualité
            </Button>
          </div>
        </div>
      </DashboardAnimate>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading || !data ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <>
          <div className={dashboardCardGrid}>
            <KpiCard label="Publications" value={formatNumber(data.summary.total_posts)} icon={Newspaper} />
            <KpiCard label="Vues totales" value={formatNumber(data.summary.total_views)} icon={Eye} />
            <KpiCard label="Réactions" value={formatNumber(data.summary.total_likes)} icon={Heart} />
            <KpiCard label="Commentaires" value={formatNumber(data.summary.total_comments)} icon={MessageCircle} />
            <KpiCard label="Partages" value={formatNumber(data.summary.total_shares)} icon={Share2} />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Rechercher une publication…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Link href="/actualites" className="text-sm font-medium text-brand-600 hover:underline">
              Voir le fil public →
            </Link>
          </div>

          {data.data.length === 0 ? (
            <EmptyState title="Aucune publication" description="Créez votre première actualité pour informer les membres." />
          ) : (
            <NewsAdminTable posts={data.data} onViewDetail={setDetailPost} onArchive={(id) => void archive(id)} />
          )}
        </>
      )}

      <NewsAdminDetailModal
        post={detailPost}
        open={!!detailPost}
        onClose={() => setDetailPost(null)}
        onArchive={(id) => void archive(id)}
      />
    </div>
  );
}
