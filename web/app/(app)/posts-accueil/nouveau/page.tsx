"use client";

import { useRouter } from "next/navigation";
import { RequirePermission } from "@/components/auth/require-permission";
import { HomePostForm } from "@/components/home-posts/home-post-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS, ROLE_SLUGS } from "@/lib/permissions";
import { Alert } from "@/components/ui/feedback";

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

        {!isSuperAdmin ? (
          <Alert tone="warning" title="Accès restreint">
            Seul le super administrateur peut créer des posts d&apos;accueil.
          </Alert>
        ) : (
          <Card>
            <CardHeader
              title="Nouveau post d'accueil"
              description="Ce contenu s'affiche sur la page Actualités publique (/infos)."
            />
            <CardBody>
              <HomePostForm onSuccess={() => router.push("/posts-accueil")} />
            </CardBody>
          </Card>
        )}
      </div>
    </RequirePermission>
  );
}
