"use client";

import { RequirePermission } from "@/components/auth/require-permission";
import { PlatformSettingsPanel } from "@/components/settings/platform-settings-panel";
import { PERMISSIONS } from "@/lib/permissions";

export default function SystemSettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.settingsManage}>
      <PlatformSettingsPanel />
    </RequirePermission>
  );
}
