"use client";

import { useState } from "react";
import { RequirePermission } from "@/components/auth/require-permission";
import { NewsFilters } from "@/components/news/news-filters";
import { NewsHero } from "@/components/news/news-hero";
import { NewsPostCard } from "@/components/news/news-post-card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useDebounced } from "@/lib/hooks";
import { useNewsFeed } from "@/lib/hooks/use-news-feed";
import { useNotificationFeed } from "@/lib/hooks/use-notification-feed";
import { PERMISSIONS } from "@/lib/permissions";

export default function ActualitesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.activitiesView}>
      <ActualitesFeed />
    </RequirePermission>
  );
}

function ActualitesFeed() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const debouncedSearch = useDebounced(search, 400);
  const { unreadCount } = useNotificationFeed();
  const { posts, loading, loadingMore, error, loadMore, hasMore, reload } = useNewsFeed({
    q: debouncedSearch,
    category,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <Breadcrumb items={[{ href: "/activites", label: "Mobilisation" }, { label: "Actualités" }]} />

      <NewsHero search={search} onSearchChange={setSearch} unreadNotifications={unreadCount} />

      <NewsFilters category={category} onCategoryChange={setCategory} />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : null}

      {!loading && posts.length === 0 ? (
        <EmptyState title="Aucune actualité" description="Revenez bientôt pour les dernières informations de Jeunesse Parle." />
      ) : null}

      <div className="space-y-4">
        {posts.map((post) => (
          <NewsPostCard key={post.id} post={post} compact onUpdated={reload} />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="secondary" loading={loadingMore} onClick={loadMore}>
            Charger plus
          </Button>
        </div>
      ) : null}
    </div>
  );
}
