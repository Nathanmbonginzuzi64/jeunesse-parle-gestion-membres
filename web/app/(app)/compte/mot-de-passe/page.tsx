"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { PasswordStrength } from "@/components/ui/password-strength";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/auth-redirect";

export default function ChangePasswordPage() {
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
      if (nextUser) {
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
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={onboarding ? "Définir votre mot de passe" : "Changer mon mot de passe"}
      />
      {onboarding && (
        <Alert tone="info" className="mb-4">
          Utilisez le mot de passe provisoire qui vous a été communiqué, puis choisissez un mot de passe
          personnel pour votre portail web et mobile.
        </Alert>
      )}
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}
      <Card>
        <CardBody>
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
            />
            <Button type="submit" loading={submitting}>
              {onboarding ? "Continuer" : "Mettre à jour"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
