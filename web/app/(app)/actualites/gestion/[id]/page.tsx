"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { NewsForm } from "@/components/news/news-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import type { NewsPostItem } from "@/lib/news/constants";
import { PERMISSIONS } from "@/lib/permissions";

export default function EditActualitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <RequirePermission permission={[PERMISSIONS.activitiesManage, PERMISSIONS.notificationsSend]}>
      <EditActualite id={id} />
    </RequirePermission>
  );
}

function EditActualite({ id }: { id: string }) {
  const router = useRouter();
  const { data, loading, error } = useApi<{ data: NewsPostItem }>(`/news/${id}`);

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumb
        items={[
          { href: "/actualites", label: "Actualités" },
          { href: "/actualites/gestion", label: "Administration" },
          { label: "Modifier" },
        ]}
      />

      <DashboardAnimate>
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-brand-800 p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Pencil className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Modifier l&apos;actualité</h1>
              <p className="text-sm text-slate-300">{data?.data.title ?? "Chargement…"}</p>
            </div>
          </div>
        </div>
      </DashboardAnimate>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {loading || !data ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <NewsForm initial={data.data} onSuccess={() => router.push("/actualites/gestion")} />
      )}
    </div>
  );
}
