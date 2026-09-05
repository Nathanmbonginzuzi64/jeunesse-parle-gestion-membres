"use client";

import { useRouter } from "next/navigation";
import { RequirePermission } from "@/components/auth/require-permission";
import { HomePostForm } from "@/components/home-posts/home-post-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Alert } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";

export default function NouveauHomePostPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole(ROLE_SLUGS.superAdmin);

  return (
    <RequirePermission permission={PERMISSIONS.settingsManage}>
      <div className="space-y-6 pb-10">
        <Breadcrumb
          items={[
            { href: "/posts-accueil", label: "Posts d'accueil" },
            { label: "Nouveau" },
          ]}
        />

        <div className="rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-lg">
          <p className="text-xs font-semibold tracking-[0.18em] text-brand-100 uppercase">
            Publication
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Nouveau post d&apos;accueil</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-50/85">
            Rédigez le contenu, ajoutez une image, puis publiez sur la page Actualités publique
            (/infos). Une barre de progression s&apos;affiche pendant l&apos;envoi.
          </p>
        </div>

        {!isSuperAdmin ? (
          <Alert tone="warning" title="Accès restreint">
            Seul le super administrateur peut créer des posts d&apos;accueil.
          </Alert>
        ) : (
          <HomePostForm onSuccess={() => router.push("/posts-accueil")} />
        )}
      </div>
    </RequirePermission>
  );
}
