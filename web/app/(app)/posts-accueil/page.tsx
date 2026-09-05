"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { api, ApiError, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HomePost } from "@/lib/home-posts";
import { getFastPollMs, subscribeRealtimeRefresh } from "@/lib/realtime";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import { formatDate, formatNumber } from "@/lib/utils";

export default function HomePostsAdminPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSuperAdmin = hasRole(ROLE_SLUGS.superAdmin);

  const totals = useMemo(() => {
    return posts.reduce(
      (acc, post) => ({
        posts: acc.posts + 1,
        published: acc.published + (post.is_published ? 1 : 0),
        views: acc.views + (post.views_count ?? 0),
        likes: acc.likes + (post.likes_count ?? 0),
        comments: acc.comments + (post.comments_count ?? 0),
        shares: acc.shares + (post.shares_count ?? 0),
      }),
      { posts: 0, published: 0, views: 0, likes: 0, comments: 0, shares: 0 },
    );
  }, [posts]);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    if (!silent) setError(null);
    try {
      const response = await api.get<{ data: HomePost[] }>("/home-posts");
      setPosts(response.data ?? []);
    } catch (caught) {
      if (!silent) {
        setError(caught instanceof ApiError ? caught.message : "Impossible de charger les posts.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load(false);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const tick = () => void load(true);
    const timer = window.setInterval(tick, getFastPollMs());
    const unsubscribe = subscribeRealtimeRefresh(tick);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [isSuperAdmin]);

  async function remove(id: number) {
    if (!window.confirm("Archiver ce post d'accueil ?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/home-posts/${id}`);
      setPosts((current) => current.filter((post) => post.id !== id));
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
          <StatCard label="Posts" value={totals.posts} />
          <StatCard label="Publiés" value={totals.published} tone="emerald" />
          <StatCard label="Vues" value={totals.views} icon={<Eye className="h-4 w-4" />} />
          <StatCard label="Likes" value={totals.likes} icon={<Heart className="h-4 w-4" />} tone="rose" />
          <StatCard
            label="Commentaires"
            value={totals.comments}
            icon={<MessageCircle className="h-4 w-4" />}
          />
          <StatCard label="Partages" value={totals.shares} icon={<Share2 className="h-4 w-4" />} />
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
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li
                    key={post.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <AdminThumb url={post.image_url ?? null} title={post.title} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{post.title}</p>
                          <span
                            className={
                              post.is_published
                                ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                                : "rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700"
                            }
                          >
                            {post.is_published ? "Publié" : "Brouillon"}
                          </span>
                          {post.category && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                              {post.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                          {post.excerpt || "Sans extrait"}
                          {post.published_at ? ` · ${formatDate(post.published_at)}` : ""}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <MiniStat icon={<Eye className="h-3.5 w-3.5" />} value={post.views_count ?? 0} label="vues" />
                          <MiniStat icon={<Heart className="h-3.5 w-3.5" />} value={post.likes_count ?? 0} label="likes" />
                          <MiniStat
                            icon={<MessageCircle className="h-3.5 w-3.5" />}
                            value={post.comments_count ?? 0}
                            label="coms"
                          />
                          <MiniStat
                            icon={<Share2 className="h-3.5 w-3.5" />}
                            value={post.shares_count ?? 0}
                            label="partages"
                          />
                        </div>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex gap-2">
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
                  </li>
                ))}
              </ul>
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
  tone?: "brand" | "emerald" | "rose";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-800 ring-brand-100",
    emerald: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    rose: "bg-rose-50 text-rose-800 ring-rose-100",
  };
  return (
    <div className={`rounded-2xl p-4 ring-1 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
      {icon}
      {formatNumber(value)} {label}
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
        const response = await fetch(url, {
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
      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Newspaper className="h-5 w-5" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={title} className="h-16 w-20 shrink-0 rounded-lg object-cover" />
  );
}
