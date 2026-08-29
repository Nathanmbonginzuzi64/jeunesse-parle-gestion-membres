"use client";

import { useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/topbar";
import { RequirePermission } from "@/components/auth/require-permission";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Switch } from "@/components/ui/field";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/toast";

interface SettingsPayload {
  organization: { name: string; country: string };
  membership: { minimum_age: number; maximum_age: number };
  security: { two_factor: boolean; session_timeout_minutes: number };
  notifications: { email: boolean; sms: boolean; push: boolean };
  cards: { duration_months: number; template: string };
  maintenance: boolean;
}

export default function SettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.settingsManage}>
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<SettingsPayload>("/settings");
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsPayload | null>(null);
  const current = form ?? data;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    setSaving(true);
    try {
      const response = await api.post<{ message: string }>("/settings", current);
      toast.success(response.message);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !current) return <PageLoader />;
  if (error || !current) return <Alert tone="error">{error ?? "Paramètres indisponibles."}</Alert>;

  return (
    <div>
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Administration" }, { label: "Paramètres" }]} />
      <PageHeader title="Paramètres" description="Configuration générale de la plateforme." />
      <Tabs
        tabs={[
          { id: "general", label: "Général" },
          { id: "security", label: "Sécurité" },
          { id: "notifications", label: "Notifications" },
          { id: "cards", label: "Carte membre" },
          { id: "system", label: "Système" },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-6"
      />
      <form onSubmit={onSubmit}>
        <TabPanel when="general" active={tab}>
          <Card>
            <CardHeader title="Identité de la plateforme" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nom"
                value={current.organization.name}
                onChange={(event) =>
                  setForm({ ...current, organization: { ...current.organization, name: event.target.value } })
                }
              />
              <Input
                label="Pays"
                value={current.organization.country}
                onChange={(event) =>
                  setForm({ ...current, organization: { ...current.organization, country: event.target.value } })
                }
              />
            </CardBody>
          </Card>
        </TabPanel>
        <TabPanel when="security" active={tab}>
          <Card>
            <CardHeader title="Sécurité" />
            <CardBody className="space-y-4">
              <Switch
                label="Authentification à deux facteurs"
                description="Recommandée pour les administrateurs nationaux."
                checked={current.security.two_factor}
                onChange={(checked) =>
                  setForm({ ...current, security: { ...current.security, two_factor: checked } })
                }
              />
              <Input
                label="Expiration de session (minutes)"
                type="number"
                value={current.security.session_timeout_minutes}
                onChange={(event) =>
                  setForm({
                    ...current,
                    security: { ...current.security, session_timeout_minutes: Number(event.target.value) },
                  })
                }
              />
            </CardBody>
          </Card>
        </TabPanel>
        <TabPanel when="notifications" active={tab}>
          <Card>
            <CardHeader title="Canaux" />
            <CardBody className="space-y-4">
              <Switch
                label="E-mail"
                checked={current.notifications.email}
                onChange={(checked) =>
                  setForm({ ...current, notifications: { ...current.notifications, email: checked } })
                }
              />
              <Switch
                label="SMS"
                checked={current.notifications.sms}
                onChange={(checked) =>
                  setForm({ ...current, notifications: { ...current.notifications, sms: checked } })
                }
              />
              <Switch
                label="Notifications internes"
                checked={current.notifications.push}
                onChange={(checked) =>
                  setForm({ ...current, notifications: { ...current.notifications, push: checked } })
                }
              />
            </CardBody>
          </Card>
        </TabPanel>
        <TabPanel when="cards" active={tab}>
          <Card>
            <CardHeader title="Modèle de carte" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Durée de validité (mois)"
                type="number"
                value={current.cards.duration_months}
                onChange={(event) =>
                  setForm({ ...current, cards: { ...current.cards, duration_months: Number(event.target.value) } })
                }
              />
              <Input
                label="Gabarit"
                value={current.cards.template}
                onChange={(event) =>
                  setForm({ ...current, cards: { ...current.cards, template: event.target.value } })
                }
              />
            </CardBody>
          </Card>
        </TabPanel>
        <TabPanel when="system" active={tab}>
          <Card>
            <CardHeader title="Système" />
            <CardBody>
              <Switch
                label="Mode maintenance"
                description="Les espaces publics restent accessibles, l’administration est restreinte."
                checked={current.maintenance}
                onChange={(checked) => setForm({ ...current, maintenance: checked })}
              />
            </CardBody>
          </Card>
        </TabPanel>
        <div className="mt-4 flex justify-end">
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
