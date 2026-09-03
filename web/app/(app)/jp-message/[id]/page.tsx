"use client";

import { useParams } from "next/navigation";
import { JpInbox } from "@/components/jp-message/jp-inbox";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

export default function JpMessageDetailPage() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const admin = can(PERMISSIONS.usersView);

  return (
    <div className="space-y-4">
      <Breadcrumb
        items={[
          { href: admin ? "/jp-message/gestion" : "/jp-message", label: "JP Message" },
          { label: `Conversation #${params.id}` },
        ]}
      />
      <JpInbox admin={admin} initialId={params.id} />
    </div>
  );
}
