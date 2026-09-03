"use client";

import { NotificationPreferencesPanel } from "@/components/notifications/notification-preferences-panel";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { NotificationPreferences } from "@/components/notifications/notification-preferences-panel";

export default function ParametresNotificationsPage() {
  const toast = useToast();
  const [busy, setBusy] = useState<"all-on" | "all-off" | null>(null);

  async function setAll(enabled: boolean) {
    setBusy(enabled ? "all-on" : "all-off");
    try {
      const payload: NotificationPreferences = {
        activity: enabled,
        news: enabled,
        message: enabled,
        presence: enabled,
        security: true,
        promotion: enabled,
        reminder: enabled,
        push_enabled: enabled,
        email_enabled: enabled,
      };
      const response = await api.put<{ message: string }>("/notification-preferences", payload);
      toast.success(response.message);
      window.location.reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    /* panel loads its own data */
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" loading={busy === "all-on"} onClick={() => void setAll(true)}>
          Activer toutes les notifications
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={busy === "all-off"}
          onClick={() => void setAll(false)}
        >
          Désactiver toutes les notifications
        </Button>
      </div>
      <NotificationPreferencesPanel />
    </div>
  );
}
