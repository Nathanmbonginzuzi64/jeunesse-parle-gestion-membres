"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  CreditCard,
  Shield,
  Wrench,
} from "lucide-react";
import { RequirePermission } from "@/components/auth/require-permission";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { SettingsHero } from "@/components/settings/settings-hero";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Switch } from "@/components/ui/field";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { KpiCard, dashboardCardGrid } from "@/components/ui/kpi";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { PERMISSIONS } from "@/lib/permissions";
import type { SettingsPayload } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.settingsManage}>
      <SettingsContent />
    </RequirePermission>
  );
}

function SettingsContent() {
  const toast = useToast();
  const { user } = useAuth();
  const { data, loading, error } = useApi<SettingsPayload>("/settings");
  const [tab, setTab] = useState("general");
  const [form, setForm] = useState<SettingsPayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const skipFirst = useRef(true);
  const current = form ?? data;

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  useEffect(() => {
    if (!form) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void persist(form);
    }, 500);
    return () => window.clearTimeout(timer);
    // persist is stable enough for debounce on form identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  async function persist(payload: SettingsPayload) {
    setSaving(true);
    try {
      const response = await api.put<SettingsPayload & { message: string }>("/settings", payload);
      setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      setForm((currentForm) => currentForm ?? response);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  function patch(next: SettingsPayload) {
    setForm(next);
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

      <DashboardAnimate delay={40}>
        <Card className="overflow-hidden">
          <CardBody className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-slate-50 to-white">
            <Avatar src={user?.photo_url} name={user?.name} size="lg" rounded="lg" className="ring-2 ring-white shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Compte connecté</p>
              <p className="truncate text-lg font-semibold text-slate-900">{user?.name}</p>
              <p className="truncate text-sm text-slate-500">
                {user?.role?.name} · {user?.email ?? user?.phone}
              </p>
            </div>
            <Link href="/profil">
              <Button variant="outline" size="sm">Voir / modifier mon profil</Button>
            </Link>
          </CardBody>
        </Card>
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

      <div className="flex items-center justify-between gap-3">
        <DashboardAnimate delay={80}>
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
        <p className="text-xs text-slate-400">
          {saving ? "Enregistrement…" : savedAt ? `Enregistré à ${savedAt}` : "Enregistrement automatique"}
        </p>
      </div>

      <TabPanel when="general" active={tab}>
        <DashboardAnimate delay={120}>
          <Card>
            <CardHeader
              title="Identité de la plateforme"
              description="Les âges d’adhésion s’appliquent dès l’enregistrement."
              action={<Building2 className="h-5 w-5 text-slate-400" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Nom"
                value={current.organization.name}
                onChange={(event) =>
                  patch({ ...current, organization: { ...current.organization, name: event.target.value } })
                }
              />
              <Input
                label="Pays"
                value={current.organization.country}
                onChange={(event) =>
                  patch({ ...current, organization: { ...current.organization, country: event.target.value } })
                }
              />
              <Input
                label="Âge minimum d'adhésion"
                type="number"
                value={current.membership.minimum_age}
                onChange={(event) =>
                  patch({
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
                  patch({
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
              description="Les interrupteurs sont pris en compte immédiatement."
              action={<Shield className="h-5 w-5 text-slate-400" />}
            />
            <CardBody className="space-y-4">
              <Switch
                label="Authentification à deux facteurs"
                description="Recommandée pour les administrateurs nationaux."
                checked={current.security.two_factor}
                onChange={(checked) =>
                  patch({ ...current, security: { ...current.security, two_factor: checked } })
                }
              />
              <Input
                label="Expiration de session (minutes)"
                type="number"
                value={current.security.session_timeout_minutes}
                onChange={(event) =>
                  patch({
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
                  patch({ ...current, notifications: { ...current.notifications, email: checked } })
                }
              />
              <Switch
                label="SMS"
                description="Messages critiques uniquement (coût opérateur)."
                checked={current.notifications.sms}
                onChange={(checked) =>
                  patch({ ...current, notifications: { ...current.notifications, sms: checked } })
                }
              />
              <Switch
                label="Notifications internes"
                description="Centre d'alertes dans l'application."
                checked={current.notifications.push}
                onChange={(checked) =>
                  patch({ ...current, notifications: { ...current.notifications, push: checked } })
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
              description="Durée de validité appliquée aux nouvelles cartes émises."
              action={<CreditCard className="h-5 w-5 text-slate-400" />}
            />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Durée de validité (mois)"
                type="number"
                value={current.cards.duration_months}
                onChange={(event) =>
                  patch({ ...current, cards: { ...current.cards, duration_months: Number(event.target.value) } })
                }
              />
              <Input
                label="Gabarit"
                value={current.cards.template}
                onChange={(event) =>
                  patch({ ...current, cards: { ...current.cards, template: event.target.value } })
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
                onChange={(checked) => patch({ ...current, maintenance: checked })}
              />
            </CardBody>
          </Card>
        </DashboardAnimate>
      </TabPanel>
    </div>
  );
}
