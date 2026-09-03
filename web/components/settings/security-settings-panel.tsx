"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fingerprint, KeyRound, MonitorSmartphone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { PasswordStrength } from "@/components/ui/password-strength";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/auth-redirect";

export function SecuritySettingsPanel() {
  const toast = useToast();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const onboarding = Boolean(user?.must_change_password);

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});
    try {
      const response = await api.post<{ message: string; user?: typeof user }>("/auth/change-password", {
        current_password: current,
        password,
        password_confirmation: confirmation,
      });
      toast.success(response.message);
      await refresh();
      const nextUser = response.user ?? user;
      if (onboarding && nextUser) {
        router.replace(getPostLoginPath(nextUser));
      }
      setCurrent("");
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors(fieldErrors(caught));
        setError(caught.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {onboarding && (
        <Alert tone="info">
          Utilisez le mot de passe provisoire, puis choisissez un mot de passe personnel pour le portail web et mobile.
        </Alert>
      )}

      <Card>
        <CardHeader
          title="Mot de passe"
          description="Dernière modification non historisée côté client — le changement révoque les autres sessions."
          action={<KeyRound className="h-5 w-5 text-slate-400" />}
        />
        <CardBody>
          {error && <Alert tone="error" className="mb-4">{error}</Alert>}
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label={onboarding ? "Mot de passe provisoire" : "Mot de passe actuel"}
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              error={errors.current_password}
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              hint="8 caractères minimum, lettres et chiffres."
            />
            <PasswordStrength password={password} />
            <Input
              label="Confirmation"
              type="password"
              required
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              error={errors.password_confirmation}
            />
            <Button type="submit" loading={submitting}>
              Modifier
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Authentification à deux facteurs"
          description="Politique TOTP individuelle — en préparation ; la politique plateforme est gérée par le super-admin."
          action={<Shield className="h-5 w-5 text-slate-400" />}
        />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Statut</p>
            <Badge tone="neutral">Désactivée</Badge>
          </div>
          <Button type="button" variant="outline" disabled>
            Activer (bientôt)
          </Button>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/parametres/appareils"
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:bg-slate-50"
        >
          <MonitorSmartphone className="mt-0.5 h-5 w-5 text-brand-600" />
          <span>
            <span className="block text-sm font-medium text-slate-900">Sessions actives</span>
            <span className="text-xs text-slate-500">Gérer mes appareils connectés</span>
          </span>
        </Link>
        <Link
          href="/parametres/biometrie"
          className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:bg-slate-50"
        >
          <Fingerprint className="mt-0.5 h-5 w-5 text-brand-600" />
          <span>
            <span className="block text-sm font-medium text-slate-900">Biométrie</span>
            <span className="text-xs text-slate-500">
              {user?.fingerprint_enrolled ? "Credential configuré" : "Ajouter une authentification"}
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
