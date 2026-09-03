"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { JpInbox } from "@/components/jp-message/jp-inbox";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageLoader } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export default function JpMessageDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <JpMessageDetailInner />
    </Suspense>
  );
}

function JpMessageDetailInner() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const admin = can(PERMISSIONS.usersView);

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { href: "/jp-message", label: "JP Message" },
          { label: `Dossier #${params.id}` },
        ]}
      />
      <JpInbox admin={admin} initialId={params.id} />
    </div>
  );
}
