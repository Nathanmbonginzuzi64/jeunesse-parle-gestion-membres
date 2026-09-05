"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  Heart,
  MessageCircle,
  Newspaper,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/table";
import { api, ApiError, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HomePost } from "@/lib/home-posts";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import { formatCompactCount, formatDate, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PER_PAGE = 10;

type Summary = {
  posts: number;
  published: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

const EMPTY_SUMMARY: Summary = {
  posts: 0,
  published: 0,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
};

export default function HomePostsAdminPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSuperAdmin = hasRole(ROLE_SLUGS.superAdmin);

  const load = useCallback(
    async (targetPage: number, silent = false) => {
      if (!silent) setLoading(true);
      if (!silent) setError(null);
      try {
        const response = await api.get<{
          data: HomePost[];
          meta?: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
          };
          summary?: Summary;
        }>("/home-posts", { page: targetPage, per_page: PER_PAGE });

        setPosts(response.data ?? []);
        setPage(Number(response.meta?.current_page ?? targetPage));
        setLastPage(Math.max(1, Number(response.meta?.last_page ?? 1)));
        setTotal(Number(response.meta?.total ?? response.data?.length ?? 0));
        setSummary(response.summary ?? EMPTY_SUMMARY);
      } catch (caught) {
        if (!silent) {
          setError(caught instanceof ApiError ? caught.message : "Impossible de charger les posts.");
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load(page, false);
  }, [load, page]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const tick = () => void load(page, true);
    const timer = window.setInterval(tick, getFastPollMs());
    const unsubscribe = subscribeRealtimeRefresh(tick);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [isSuperAdmin, load, page]);

  async function remove(id: number) {
    if (!window.confirm("Archiver ce post d'accueil ?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/home-posts/${id}`);
      const nextCount = posts.length - 1;
      if (nextCount <= 0 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load(page, true);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <RequirePermission permission={PERMISSIONS.settingsManage}>
      <div className="space-y-6 pb-10">
        <Breadcrumb items={[{ label: "Posts d'accueil" }]} />

        <div className="rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-100 uppercase">
                Super administration
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Posts d&apos;accueil</h1>
              <p className="mt-1 max-w-2xl text-sm text-brand-50/85">
                Gérez les publications de la page Actualités publique (/infos), suivez les
                performances et publiez de nouveaux contenus.
              </p>
            </div>
            {isSuperAdmin && (
              <Button
                className="bg-white text-brand-800 hover:bg-brand-50"
                onClick={() => router.push("/posts-accueil/nouveau")}
              >
                <Plus className="h-4 w-4" />
                Nouveau post
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Posts" value={summary.posts} />
          <StatCard label="Publiés" value={summary.published} tone="emerald" />
          <StatCard label="Vues" value={summary.views} icon={<Eye className="h-4 w-4" />} tone="sky" />
          <StatCard label="Likes" value={summary.likes} icon={<Heart className="h-4 w-4" />} tone="rose" />
          <StatCard
            label="Commentaires"
            value={summary.comments}
            icon={<MessageCircle className="h-4 w-4" />}
            tone="emerald"
          />
          <StatCard label="Partages" value={summary.shares} icon={<Share2 className="h-4 w-4" />} tone="violet" />
        </div>

        <Card>
          <CardHeader
            title="Publications"
            description="Statistiques par actualité (vues, likes, commentaires, partages)."
          />
          <CardBody className="space-y-4">
            {!isSuperAdmin && (
              <Alert tone="warning" title="Accès restreint">
                Seul le super administrateur peut publier sur la page d&apos;accueil.
              </Alert>
            )}

            {error && (
              <Alert tone="error" title="Erreur">
                {error}
              </Alert>
            )}

            {loading ? (
              <p className="text-sm text-slate-500">Chargement…</p>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <Newspaper className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">Aucun post pour le moment</p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => router.push("/posts-accueil/nouveau")}>
                    Créer le premier post
                  </Button>
                )}
              </div>
            ) : (
              <>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {posts.map((post) => (
                    <li
                      key={post.id}
                      className="group p-4 transition hover:bg-slate-50/80 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        <AdminThumb url={post.image_url ?? null} title={post.title} />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-base font-semibold text-slate-900">
                                  {post.title}
                                </p>
                                <span
                                  className={
                                    post.is_published
                                      ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100"
                                      : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100"
                                  }
                                >
                                  {post.is_published ? "Publié" : "Brouillon"}
                                </span>
                                {post.category && (
                                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
                                    {post.category}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                {post.excerpt || "Sans extrait"}
                                {post.published_at ? ` · ${formatDate(post.published_at)}` : ""}
                              </p>
                            </div>

                            {isSuperAdmin && (
                              <div className="flex shrink-0 gap-2">
                                <Link href={`/infos/${post.id}`} target="_blank">
                                  <Button variant="ghost" size="sm">
                                    Voir
                                  </Button>
                                </Link>
                                <Link href={`/posts-accueil/${post.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Pencil className="h-3.5 w-3.5" />
                                    Modifier
                                  </Button>
                                </Link>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  loading={deletingId === post.id}
                                  onClick={() => void remove(post.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <EngagementChip
                              icon={<Eye className="h-3.5 w-3.5" />}
                              value={post.views_count ?? 0}
                              label="vues"
                              tone="sky"
                            />
                            <EngagementChip
                              icon={<Heart className="h-3.5 w-3.5" />}
                              value={post.likes_count ?? 0}
                              label="likes"
                              tone="rose"
                            />
                            <EngagementChip
                              icon={<MessageCircle className="h-3.5 w-3.5" />}
                              value={post.comments_count ?? 0}
                              label="coms"
                              tone="emerald"
                            />
                            <EngagementChip
                              icon={<Share2 className="h-3.5 w-3.5" />}
                              value={post.shares_count ?? 0}
                              label="partages"
                              tone="violet"
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <Pagination
                  page={page}
                  lastPage={lastPage}
                  total={total}
                  perPage={PER_PAGE}
                  onChange={setPage}
                  label="posts"
                />
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </RequirePermission>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "brand",
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  tone?: "brand" | "emerald" | "rose" | "sky" | "violet";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-800 ring-brand-100",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    rose: "bg-rose-50 text-rose-800 ring-rose-100",
    sky: "bg-sky-50 text-sky-800 ring-sky-100",
    violet: "bg-violet-50 text-violet-800 ring-violet-100",
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatCompactCount(value)}</p>
      {value >= 1000 && (
        <p className="mt-0.5 text-[10px] tabular-nums opacity-70">{formatNumber(value)}</p>
      )}
    </div>
  );
}

function EngagementChip({
  icon,
  value,
  label,
  tone,
}: {
  icon: ReactNode;
  value: number;
  label: string;
  tone: "sky" | "rose" | "emerald" | "violet";
}) {
  const tones = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold ring-1",
        tones[tone],
      )}
      title={`${formatNumber(value)} ${label}`}
    >
      {icon}
      <span className="tabular-nums">{formatCompactCount(value)}</span>
      <span className="font-medium opacity-75">{label}</span>
    </span>
  );
}

function AdminThumb({ url, title }: { url: string | null; title: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadImage() {
      const token = getToken();
      try {
        const response = await fetch(url!, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) return;
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        /* ignore */
      }
    }

    void loadImage();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) {
    return (
      <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 shadow-inner">
        <Newspaper className="h-6 w-6" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className="h-20 w-28 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-slate-200/80"
    />
  );
}
