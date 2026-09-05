"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { Alert } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { api, ApiError, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HomePost } from "@/lib/home-posts";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export default function HomePostsAdminPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [posts, setPosts] = useState<HomePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isSuperAdmin = hasRole(ROLE_SLUGS.superAdmin);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: HomePost[] }>("/home-posts");
      setPosts(response.data ?? []);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Impossible de charger les posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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

        <Card>
          <CardHeader
            title="Posts d'accueil"
            description="Publications affichées sur la page Actualités publique (/infos). Indépendant du fil membres (/actualites)."
            action={
              isSuperAdmin ? (
                <Button onClick={() => router.push("/posts-accueil/nouveau")}>
                  <Plus className="h-4 w-4" />
                  Nouveau post
                </Button>
              ) : undefined
            }
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
                <p className="mt-1 text-xs text-slate-500">
                  Créez un post publié pour qu&apos;il apparaisse immédiatement sur /infos.
                </p>
                {isSuperAdmin && (
                  <Button className="mt-4" onClick={() => router.push("/posts-accueil/nouveau")}>
                    Créer le premier post
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {posts.map((post) => (
                  <li key={post.id} className="flex flex-wrap items-center gap-4 p-4">
                    <AdminThumb url={post.image_url} title={post.title} />
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
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {post.excerpt || "Sans extrait"}
                        {post.published_at ? ` · ${formatDate(post.published_at)}` : ""}
                      </p>
                    </div>
                    {isSuperAdmin && (
                      <div className="flex gap-2">
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
