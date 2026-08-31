"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { NewsPostCard, type NewsPostItem } from "@/components/news/news-post-card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";

export default function ActualitesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.activitiesView}>
      <ActualitesFeed />
    </RequirePermission>
  );
}

function ActualitesFeed() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<{ data: NewsPostItem[] }>("/news");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setPublishing(true);
    try {
      await api.post("/news", { title, body });
      toast.success("Actualité publiée.");
      setTitle("");
      setBody("");
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Publication impossible.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumb items={[{ href: "/activites", label: "Mobilisation" }, { label: "JP Actualités" }]} />

      <DashboardAnimate>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Newspaper className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">JP Actualités</h1>
            <p className="text-sm text-slate-600">Fil d&apos;information — réactions et commentaires</p>
          </div>
        </div>
      </DashboardAnimate>

      <Card>
        <CardBody>
          <form onSubmit={publish} className="space-y-3">
            <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea label="Contenu" value={body} onChange={(e) => setBody(e.target.value)} rows={4} required />
            <Button type="submit" loading={publishing}>
              Publier
            </Button>
          </form>
        </CardBody>
      </Card>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading ? <Skeleton className="h-40 w-full" /> : null}

      {!loading && !data?.data.length ? (
        <EmptyState title="Aucune actualité" description="Soyez le premier à publier une information." />
      ) : (
        <div className="space-y-4">
          {data?.data.map((post) => (
            <NewsPostCard key={post.id} post={post} onUpdated={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
