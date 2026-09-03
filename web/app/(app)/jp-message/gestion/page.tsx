"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { JpInbox } from "@/components/jp-message/jp-inbox";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PERMISSIONS } from "@/lib/permissions";

export default function JpMessageAdminPage() {
  return (
    <RequirePermission permission={PERMISSIONS.usersView}>
      <div className="space-y-4">
        <Breadcrumb items={[{ href: "/jp-message", label: "JP Message" }, { label: "Administration" }]} />
        <JpInbox admin />
      </div>
    </RequirePermission>
  );
}
