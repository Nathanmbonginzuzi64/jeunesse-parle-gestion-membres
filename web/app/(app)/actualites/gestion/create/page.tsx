"use client";

import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { NewsForm } from "@/components/news/news-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PERMISSIONS } from "@/lib/permissions";

export default function CreateActualitePage() {
  const router = useRouter();

  return (
    <RequirePermission permission={[PERMISSIONS.activitiesManage, PERMISSIONS.notificationsSend]}>
      <div className="space-y-6 pb-10">
        <Breadcrumb
          items={[
            { href: "/actualites", label: "Actualités" },
            { href: "/actualites/gestion", label: "Administration" },
            { label: "Nouvelle publication" },
          ]}
        />

        <DashboardAnimate>
          <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-700 p-6 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6" />
              <div>
                <h1 className="text-xl font-bold">Créer une actualité</h1>
                <p className="text-sm text-brand-100">Rédigez et prévisualisez votre publication en temps réel</p>
              </div>
            </div>
          </div>
        </DashboardAnimate>

        <NewsForm onSuccess={() => router.push("/actualites/gestion")} />
      </div>
    </RequirePermission>
  );
}
