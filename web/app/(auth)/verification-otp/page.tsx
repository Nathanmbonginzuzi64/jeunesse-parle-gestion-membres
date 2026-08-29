"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { OtpInput } from "@/components/ui/otp-input";
import { Alert, PageLoader } from "@/components/ui/feedback";
import { PasswordStrength } from "@/components/ui/password-strength";
import { api, ApiError } from "@/lib/api";

function OtpFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const login = params.get("login") ?? "";
  const [step, setStep] = useState<"otp" | "password">("otp");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(login);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (code.length < 6) {
      setError("Saisissez les 6 chiffres.");
      return;
    }
    setStep("password");
    setError(null);
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.public.post("/auth/reset-password", {
        token: code,
        email,
        password,
        password_confirmation: confirmation,
      });
      router.push("/connexion");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Réinitialisation impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vérification</h1>
      <p className="mt-1 text-sm text-slate-500">
        {step === "otp"
          ? "Entrez le code à 6 chiffres envoyé sur votre téléphone ou e-mail."
          : "Choisissez un nouveau mot de passe sécurisé."}
      </p>
      {error && <Alert tone="error" className="mt-4">{error}</Alert>}

      {step === "otp" ? (
        <form onSubmit={verifyOtp} className="mt-8 space-y-6">
          <OtpInput value={code} onChange={setCode} disabled={submitting} />
          <Button type="submit" className="w-full">
            Continuer
          </Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-8 space-y-4">
          <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Nouveau mot de passe" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength password={password} />
          <Input label="Confirmation" type="password" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          <Button type="submit" loading={submitting} className="w-full">
            Réinitialiser
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/connexion" className="font-medium text-brand-700">
          Retour à la connexion
        </Link>
      </p>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <OtpFlow />
    </Suspense>
  );
}
