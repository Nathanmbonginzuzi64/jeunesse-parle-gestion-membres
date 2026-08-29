"use client";

import { useState, type FormEvent } from "react";
import {
  Bell,
  Building2,
  CreditCard,
  Save,
  Shield,
  Wrench,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { SettingsHero } from "@/components/settings/settings-hero";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Switch } from "@/components/ui/field";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

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
      setForm(current);
      reload();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !current) return <PageLoader />;
  if (error || !current) return <Alert tone="error">{error ?? "Paramètres indisponibles."}</Alert>;

  const channelsOn = [
    current.notifications.email,
    current.notifications.sms,
    current.notifications.push,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Administration" }, { label: "Paramètres" }]} />

      <DashboardAnimate>
        <SettingsHero organization={current.organization.name} maintenance={current.maintenance} />
      </DashboardAnimate>

      <DashboardAnimate delay={60}>
        <div className={cn(dashboardCardGrid, "sm:grid-cols-2 lg:grid-cols-4")}>
          <KpiCard
            label="Organisation"
            value={current.organization.country || "—"}
            hint={current.organization.name}
            icon={Building2}
            tone="info"
          />
          <KpiCard
            label="Session"
            value={`${current.security.session_timeout_minutes} min`}
            hint={current.security.two_factor ? "2FA activée" : "2FA désactivée"}
            icon={Shield}
            tone={current.security.two_factor ? "success" : "warning"}
          />
          <KpiCard
            label="Canaux notif."
            value={`${channelsOn}/3`}
            hint="E-mail · SMS · Push"
            icon={Bell}
            tone="neutral"
          />
          <KpiCard
            label="Carte membre"
            value={`${current.cards.duration_months} mois`}
            hint={current.cards.template}
            icon={CreditCard}
            tone="info"
          />
        </div>
      </DashboardAnimate>

      <DashboardAnimate delay={100}>
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
        />
      </DashboardAnimate>

      <form onSubmit={onSubmit} className="space-y-4">
        <TabPanel when="general" active={tab}>
          <DashboardAnimate delay={120}>
            <Card>
              <CardHeader
                title="Identité de la plateforme"
                description="Nom affiché et pays de déploiement"
                action={<Building2 className="h-5 w-5 text-slate-400" />}
              />
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
                <Input
                  label="Âge minimum d'adhésion"
                  type="number"
                  value={current.membership.minimum_age}
                  onChange={(event) =>
                    setForm({
                      ...current,
                      membership: { ...current.membership, minimum_age: Number(event.target.value) },
                    })
                  }
                />
                <Input
                  label="Âge maximum d'adhésion"
                  type="number"
                  value={current.membership.maximum_age}
                  onChange={(event) =>
                    setForm({
                      ...current,
                      membership: { ...current.membership, maximum_age: Number(event.target.value) },
                    })
                  }
                />
              </CardBody>
            </Card>
          </DashboardAnimate>
        </TabPanel>

        <TabPanel when="security" active={tab}>
          <DashboardAnimate delay={120}>
            <Card>
              <CardHeader
                title="Sécurité des sessions"
                description="Authentification renforcée pour les administrateurs"
                action={<Shield className="h-5 w-5 text-slate-400" />}
              />
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
          </DashboardAnimate>
        </TabPanel>

        <TabPanel when="notifications" active={tab}>
          <DashboardAnimate delay={120}>
            <Card>
              <CardHeader
                title="Canaux de notification"
                description="Activez les canaux disponibles pour les alertes"
                action={<Bell className="h-5 w-5 text-slate-400" />}
              />
              <CardBody className="space-y-4">
                <Switch
                  label="E-mail"
                  description="Validations, cartes et rappels d'activités."
                  checked={current.notifications.email}
                  onChange={(checked) =>
                    setForm({ ...current, notifications: { ...current.notifications, email: checked } })
                  }
                />
                <Switch
                  label="SMS"
                  description="Messages critiques uniquement (coût opérateur)."
                  checked={current.notifications.sms}
                  onChange={(checked) =>
                    setForm({ ...current, notifications: { ...current.notifications, sms: checked } })
                  }
                />
                <Switch
                  label="Notifications internes"
                  description="Centre d'alertes dans l'application."
                  checked={current.notifications.push}
                  onChange={(checked) =>
                    setForm({ ...current, notifications: { ...current.notifications, push: checked } })
                  }
                />
              </CardBody>
            </Card>
          </DashboardAnimate>
        </TabPanel>

        <TabPanel when="cards" active={tab}>
          <DashboardAnimate delay={120}>
            <Card>
              <CardHeader
                title="Modèle de carte membre"
                description="Durée de validité et gabarit d'impression"
                action={<CreditCard className="h-5 w-5 text-slate-400" />}
              />
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
          </DashboardAnimate>
        </TabPanel>

        <TabPanel when="system" active={tab}>
          <DashboardAnimate delay={120}>
            <Card className={current.maintenance ? "ring-1 ring-amber-200" : undefined}>
              <CardHeader
                title="Système"
                description="Mode maintenance et disponibilité de l'administration"
                action={<Wrench className="h-5 w-5 text-slate-400" />}
              />
              <CardBody>
                <Switch
                  label="Mode maintenance"
                  description="Les espaces publics restent accessibles, l'administration est restreinte."
                  checked={current.maintenance}
                  onChange={(checked) => setForm({ ...current, maintenance: checked })}
                />
              </CardBody>
            </Card>
          </DashboardAnimate>
        </TabPanel>

        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button type="submit" loading={saving} size="lg" className="shadow-[var(--shadow-elevated)]">
            <Save className="h-4 w-4" />
            Enregistrer les paramètres
          </Button>
        </div>
      </form>
    </div>
  );
}
