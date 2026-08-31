"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export interface NotificationPreferences {
  activity: boolean;
  news: boolean;
  message: boolean;
  presence: boolean;
  security: boolean;
  promotion: boolean;
  reminder: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  activity: true,
  news: true,
  message: true,
  presence: true,
  security: true,
  promotion: true,
  reminder: true,
  push_enabled: true,
  email_enabled: false,
};

export function NotificationPreferencesPanel() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: NotificationPreferences }>("/notification-preferences")
      .then((response) => setPrefs(response.data))
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await api.put<{ message: string; data: NotificationPreferences }>(
        "/notification-preferences",
        prefs,
      );
      setPrefs(response.data);
      toast.success(response.message);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Chargement des préférences…</p>;
  }

  return (
    <Card>
      <CardHeader
        title="Mes préférences"
        description="Choisissez les alertes que vous souhaitez recevoir sur Jeunesse Parle."
      />
      <CardBody className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["activity", "Activités"],
              ["news", "Actualités"],
              ["message", "Messages JP"],
              ["presence", "Présences"],
              ["security", "Sécurité"],
              ["promotion", "Promotions"],
              ["reminder", "Rappels"],
            ] as const
          ).map(([key, label]) => (
            <Checkbox
              key={key}
              label={label}
              checked={prefs[key]}
              onChange={(e) => setPrefs((current) => ({ ...current, [key]: e.target.checked }))}
            />
          ))}
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Canaux</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Checkbox
              label="Notifications push (mobile / PWA)"
              checked={prefs.push_enabled}
              onChange={(e) => setPrefs((current) => ({ ...current, push_enabled: e.target.checked }))}
            />
            <Checkbox
              label="Notifications e-mail"
              checked={prefs.email_enabled}
              onChange={(e) => setPrefs((current) => ({ ...current, email_enabled: e.target.checked }))}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void save()} loading={saving}>
            Enregistrer
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
