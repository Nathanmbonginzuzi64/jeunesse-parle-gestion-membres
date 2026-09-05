"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { NewsPostCard } from "@/components/news/news-post-card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import type { NewsPostItem } from "@/lib/news/constants";
import { PERMISSIONS } from "@/lib/permissions";
import { formatCompactCount } from "@/lib/utils";

export default function ActualiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequirePermission permission={PERMISSIONS.activitiesView}>
      <ActualiteDetail id={id} />
    </RequirePermission>
  );
}

function ActualiteDetail({ id }: { id: string }) {
  const { data, loading, error, reload } = useApi<{ data: NewsPostItem }>(`/news/${id}`);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <Breadcrumb
        items={[
          { href: "/activites", label: "Mobilisation" },
          { href: "/actualites", label: "Actualités" },
          { label: "Détail" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/actualites"
          className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-brand-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-brand-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au fil
        </Link>
        {data?.data ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
            <Eye className="h-3.5 w-3.5" />
            {formatCompactCount(data.data.views_count)} vues
          </span>
        ) : null}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading || !data ? <Skeleton className="h-80 w-full rounded-2xl" /> : null}

      {data?.data ? <NewsPostCard post={data.data} onUpdated={reload} /> : null}
    </div>
  );
}
