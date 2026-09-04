"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/field";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface UserPreferences {
  who_can_contact: "authorized" | "structure" | "leaders" | "admin" | "nobody";
  read_receipts: boolean;
  show_online: boolean;
  show_last_seen: boolean;
  photo_visibility: "everyone" | "contacts" | "private";
  phone_visibility: "everyone" | "contacts" | "private";
  email_visibility: "everyone" | "contacts" | "private";
  theme: "light";
  locale: "fr";
  reduce_motion: boolean;
  auto_download_media: boolean;
  wifi_only_downloads: boolean;
}

const DEFAULT_PREFS: UserPreferences = {
  who_can_contact: "authorized",
  read_receipts: true,
  show_online: true,
  show_last_seen: true,
  photo_visibility: "contacts",
  phone_visibility: "private",
  email_visibility: "private",
  theme: "light",
  locale: "fr",
  reduce_motion: false,
  auto_download_media: true,
  wifi_only_downloads: false,
};

const CONTACT_OPTIONS: Array<{ id: UserPreferences["who_can_contact"]; label: string; hint: string }> = [
  { id: "authorized", label: "Membres autorisés", hint: "Selon les règles métier du portail" },
  { id: "structure", label: "Membres de ma structure", hint: "Uniquement ma structure locale" },
  { id: "leaders", label: "Mes responsables", hint: "Responsables de mon périmètre" },
  { id: "admin", label: "Administration", hint: "Administration nationale uniquement" },
  { id: "nobody", label: "Personne", hint: "Sauf administration nationale" },
];

const VISIBILITY_OPTIONS: Array<{ id: "everyone" | "contacts" | "private"; label: string }> = [
  { id: "everyone", label: "Tout le monde" },
  { id: "contacts", label: "Contacts autorisés" },
  { id: "private", label: "Privé" },
];

export function useUserPreferences() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: UserPreferences }>("/user-preferences")
      .then((response) => setPrefs({ ...DEFAULT_PREFS, ...response.data, theme: "light" }))
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  async function save(next: UserPreferences) {
    setSaving(true);
    setError(null);
    setPrefs(next);
    try {
      const response = await api.put<{ message: string; data: UserPreferences }>("/user-preferences", next);
      setPrefs({ ...DEFAULT_PREFS, ...response.data });
      toast.success(response.message);
      applyTheme("light", response.data.reduce_motion);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return { prefs, loading, saving, error, save, setPrefs };
}

export function applyTheme(_theme?: UserPreferences["theme"], reduceMotion?: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark");
  root.dataset.theme = "light";
  if (reduceMotion !== undefined) {
    root.dataset.reduceMotion = reduceMotion ? "1" : "0";
  }
}

export function MessagingPreferencesPanel() {
  const { prefs, loading, saving, error, save } = useUserPreferences();

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader title="Qui peut me contacter ?" description="Règle appliquée côté serveur à JP Message." />
        <CardBody className="space-y-2">
          {CONTACT_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition",
                prefs.who_can_contact === option.id
                  ? "border-brand-300 bg-brand-50/50"
                  : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <input
                type="radio"
                className="mt-1"
                name="who_can_contact"
                checked={prefs.who_can_contact === option.id}
                onChange={() => void save({ ...prefs, who_can_contact: option.id })}
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                <span className="text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Confidentialité messagerie" />
        <CardBody className="space-y-4">
          <Switch
            label="Afficher les accusés de lecture"
            checked={prefs.read_receipts}
            onChange={(checked) => void save({ ...prefs, read_receipts: checked })}
          />
          <Switch
            label="Afficher mon statut en ligne"
            checked={prefs.show_online}
            onChange={(checked) => void save({ ...prefs, show_online: checked })}
          />
          <Switch
            label="Afficher ma dernière connexion"
            checked={prefs.show_last_seen}
            onChange={(checked) => void save({ ...prefs, show_last_seen: checked })}
          />
          {saving ? <p className="text-xs text-slate-400">Enregistrement…</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

export function PrivacyPreferencesPanel() {
  const { prefs, loading, saving, error, save } = useUserPreferences();

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader
          title="Visibilité du profil"
          description="Le téléphone et l'e-mail ne peuvent pas être rendus publics (règle administration)."
        />
        <CardBody className="space-y-5">
          {(
            [
              ["photo_visibility", "Photo"],
              ["phone_visibility", "Téléphone"],
              ["email_visibility", "E-mail"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <p className="mb-2 text-sm font-medium text-slate-800">{label}</p>
              <div className="flex flex-wrap gap-2">
                {VISIBILITY_OPTIONS.filter((option) => {
                  if ((key === "phone_visibility" || key === "email_visibility") && option.id === "everyone") {
                    return false;
                  }
                  return true;
                }).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => void save({ ...prefs, [key]: option.id })}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition",
                      prefs[key] === option.id
                        ? "bg-brand-50 text-brand-800 ring-brand-200"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Switch
            label="Statut en ligne"
            checked={prefs.show_online}
            onChange={(checked) => void save({ ...prefs, show_online: checked })}
          />
          <Switch
            label="Dernière connexion"
            checked={prefs.show_last_seen}
            onChange={(checked) => void save({ ...prefs, show_last_seen: checked })}
          />
          {saving ? <p className="text-xs text-slate-400">Enregistrement…</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

export function AppearancePreferencesPanel() {
  const { prefs, loading, saving, error, save } = useUserPreferences();

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader title="Langue" description="Architecture prête pour d'autres langues." />
        <CardBody>
          <p className="text-sm font-medium text-slate-900">Français</p>
          <p className="text-xs text-slate-500">Locale active : {prefs.locale}</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Apparence" />
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-700">
            Thème : <span className="font-semibold text-slate-900">Mode clair</span>
          </p>
          <Switch
            label="Réduire les animations"
            checked={prefs.reduce_motion}
            onChange={(checked) => void save({ ...prefs, theme: "light", reduce_motion: checked })}
          />
          {saving ? <p className="text-xs text-slate-400">Enregistrement…</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}

export function StoragePreferencesPanel() {
  const { prefs, loading, saving, error, save } = useUserPreferences();
  const [cacheHint, setCacheHint] = useState("Calcul…");

  useEffect(() => {
    try {
      let bytes = 0;
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        bytes += (localStorage.getItem(key) ?? "").length * 2;
      }
      setCacheHint(`${(bytes / 1024).toFixed(1)} Ko dans le navigateur`);
    } catch {
      setCacheHint("Indisponible");
    }
  }, []);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Card>
        <CardHeader title="Utilisation locale" description="Cache navigateur (pas un quota serveur inventé)." />
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-600">{cacheHint}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                const keep = ["jp_token", "token"];
                const snapshot: Record<string, string> = {};
                keep.forEach((key) => {
                  const value = localStorage.getItem(key);
                  if (value) snapshot[key] = value;
                });
                localStorage.clear();
                Object.entries(snapshot).forEach(([key, value]) => localStorage.setItem(key, value));
                sessionStorage.clear();
                setCacheHint("Cache vidé");
              } catch {
                setCacheHint("Impossible de vider le cache");
              }
            }}
          >
            Supprimer le cache
          </Button>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Médias messagerie" />
        <CardBody className="space-y-4">
          <Switch
            label="Téléchargement automatique des médias"
            checked={prefs.auto_download_media}
            onChange={(checked) => void save({ ...prefs, auto_download_media: checked })}
          />
          <Switch
            label="Télécharger uniquement en Wi-Fi"
            checked={prefs.wifi_only_downloads}
            onChange={(checked) => void save({ ...prefs, wifi_only_downloads: checked })}
          />
          {saving ? <p className="text-xs text-slate-400">Enregistrement…</p> : null}
        </CardBody>
      </Card>
    </div>
  );
}
