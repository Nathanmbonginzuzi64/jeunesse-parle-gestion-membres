"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequirePermission } from "@/components/auth/require-permission";
import { HomePostForm } from "@/components/home-posts/home-post-form";
import { Alert } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { HomePost } from "@/lib/home-posts";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";

export default function EditHomePostPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLE_SLUGS.superAdmin);
  const [post, setPost] = useState<HomePost | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await api.get<{ data: HomePost }>(`/home-posts/${params.id}`);
        if (!cancelled) setPost(response.data);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Post introuvable.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <RequirePermission permission={PERMISSIONS.settingsManage}>
      <div className="space-y-6 pb-10">
        <Breadcrumb
          items={[
            { href: "/posts-accueil", label: "Posts d'accueil" },
            { label: "Modifier" },
          ]}
        />

        {!isSuperAdmin ? (
          <Alert tone="warning" title="Accès restreint">
            Seul le super administrateur peut modifier ces posts.
          </Alert>
        ) : loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : error || !post ? (
          <Alert tone="error" title="Erreur">
            {error ?? "Post introuvable."}
          </Alert>
        ) : (
          <Card>
            <CardHeader title="Modifier le post" description={post.title} />
            <CardBody>
              <HomePostForm
                initial={post}
                postId={post.id}
                onSuccess={() => router.push("/posts-accueil")}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </RequirePermission>
  );
}
