"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Suspense } from "react";
import { Alert, PageLoader } from "@/components/ui/feedback";

function ResetForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [token] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});

    try {
      const response = await api.public.post<{ message: string }>("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      setMessage(response.message);
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

  if (!token) {
    return (
      <Alert tone="error">
        Lien invalide. Demandez une nouvelle réinitialisation depuis la page de connexion.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {message && (
        <Alert tone="success">
          {message}{" "}
          <Link href="/connexion" className="font-medium underline">
            Se connecter
          </Link>
        </Alert>
      )}

      <Input
        label="E-mail"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors.email}
      />
      <Input
        label="Nouveau mot de passe"
        type="password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
      />
      <PasswordStrength password={password} />
      <Input
        label="Confirmation"
        type="password"
        required
        value={passwordConfirmation}
        onChange={(event) => setPasswordConfirmation(event.target.value)}
      />

      <Button type="submit" size="lg" loading={submitting} className="w-full" disabled={Boolean(message)}>
        Réinitialiser
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Nouveau mot de passe</h1>
      <p className="mt-1.5 text-sm text-slate-500">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
      <Suspense fallback={<PageLoader />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
