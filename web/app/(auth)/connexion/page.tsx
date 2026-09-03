"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint, Home, LogIn } from "lucide-react";
import { BiometricModal, type BiometricResult } from "@/components/biometrics/biometric-modal";
import { ApiError } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { getPostLoginPath } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/types";

type LoginMode = "password" | "fingerprint";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithFingerprint, user, loading: sessionLoading } = useAuth();

  const [mode, setMode] = useState<LoginMode>("password");
  const [login_, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [biometricOpen, setBiometricOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(getPostLoginPath(user));
    }
  }, [sessionLoading, user, router]);

  function redirectAfterLogin(authenticated: AuthUser) {
    router.replace(getPostLoginPath(authenticated));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const authenticated = await login({ login: login_, password });
      redirectAfterLogin(authenticated);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.fieldError("login") ?? caught.message);
        setFieldErrors({
          login: caught.fieldError("login") ?? "",
          password: caught.fieldError("password") ?? "",
        });
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
      setSubmitting(false);
    }
  }

  async function handleBiometricSuccess(result: BiometricResult) {
    if (!result.token || !result.user) {
      setError(result.message || "Connexion biométrique impossible.");
      return;
    }
    try {
      const authenticated = await loginWithFingerprint(result.user, result.token);
      setBiometricOpen(false);
      redirectAfterLogin(authenticated);
    } catch {
      setError("Session biométrique impossible à établir.");
    }
  }

  return (
    <div>
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
      >
        <Home className="h-4 w-4" />
        Retour à l&apos;accueil
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Connexion</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Mot de passe ou empreinte digitale (compte actif avec biométrie enregistrée).
      </p>

      <div className="mt-6 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
            mode === "password" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          <LogIn className="h-4 w-4" />
          Mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode("fingerprint")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
            mode === "fingerprint" ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          <Fingerprint className="h-4 w-4" />
          Empreinte
        </button>
      </div>

      <div className="mt-7">
        {error && mode === "password" && <Alert tone="error" className="mb-4">{error}</Alert>}

        {mode === "password" ? (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              label="E-mail ou téléphone"
              type="text"
              autoComplete="username"
              value={login_}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="nom@exemple.cd ou +243 …"
              error={fieldErrors.login || undefined}
              required
              autoFocus
            />

            <Input
              label="Mot de passe"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              error={fieldErrors.password || undefined}
              required
            />

            <div className="flex justify-end">
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" size="lg" loading={submitting} className="w-full">
              <LogIn className="h-4 w-4" />
              Se connecter
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 text-center">
              <Fingerprint className="mx-auto h-12 w-12 text-brand-600" />
              <p className="mt-3 text-sm font-medium text-slate-800">Se connecter avec mon empreinte</p>
              <p className="mt-1 text-xs text-slate-500">
                Windows Hello / biométrie de l&apos;appareil — aucune image d&apos;empreinte n&apos;est envoyée au serveur.
              </p>
              <Button
                type="button"
                size="lg"
                className="mt-4 w-full"
                onClick={() => {
                  setError(null);
                  setBiometricOpen(true);
                }}
              >
                <Fingerprint className="h-4 w-4" />
                Se connecter avec mon empreinte
              </Button>
            </div>
            {error && <Alert tone="error">{error}</Alert>}
          </div>
        )}
      </div>

      <BiometricModal
        open={biometricOpen}
        onClose={() => setBiometricOpen(false)}
        context="LOGIN"
        onSuccess={(result) => void handleBiometricSuccess(result)}
      />

      <p className="mt-6 text-center text-sm text-slate-500">
        Pas encore membre ?{" "}
        <Link href="/inscription" className="font-medium text-brand-600 hover:text-brand-700">
          Demander mon adhésion
        </Link>
      </p>

      {USE_MOCKS && (
        <div className="mt-8 rounded-xl border border-brand-100 bg-brand-50/70 p-3 text-xs text-slate-600">
          <p className="font-medium text-brand-800">Mode design — comptes de démonstration</p>
          <ul className="mt-1.5 space-y-0.5">
            {[
              { email: "superadmin@jeunesseparle.test", label: "Super administrateur (biométrie ✓)" },
              { email: "admin@jeunesseparle.test", label: "Admin national (biométrie ✓)" },
              { email: "kinshasa@jeunesseparle.test", label: "Responsable Kinshasa" },
              { email: "nordkivu@jeunesseparle.test", label: "Responsable Nord-Kivu" },
              { email: "agent@jeunesseparle.test", label: "Agent de vérification" },
              { email: "nathan@jeunesseparle.test", label: "Membre" },
            ].map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="hover:text-brand-700 hover:underline"
                  onClick={() => {
                    setLogin(account.email);
                    setPassword("demo");
                  }}
                >
                  {account.label} — {account.email}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-slate-500">
            Mot de passe : n&apos;importe lequel. Empreinte : superadmin ou admin (compte actif requis).
          </p>
        </div>
      )}
    </div>
  );
}
