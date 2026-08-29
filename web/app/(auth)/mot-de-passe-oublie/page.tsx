"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await api.public.post<{ message: string }>("/auth/forgot-password", { login });
      if (USE_MOCKS) {
        router.push(`/verification-otp?login=${encodeURIComponent(login)}`);
        return;
      }
      setMessage(response.message);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mot de passe oublié</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Indiquez votre e-mail ou votre téléphone. Si un compte correspond, les instructions seront
        envoyées.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}

        <Input
          label="E-mail ou téléphone"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          required
          autoFocus
        />

        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Envoyer les instructions
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/connexion" className="font-medium text-brand-600 hover:text-brand-700">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}
