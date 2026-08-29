"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { ApiError } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { ROLE_SLUGS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: sessionLoading } = useAuth();

  const [login_, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(user.role?.slug === ROLE_SLUGS.membre ? "/mon-espace" : "/tableau-de-bord");
    }
  }, [sessionLoading, user, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const authenticated = await login({ login: login_, password });
      router.replace(
        authenticated.role?.slug === ROLE_SLUGS.membre ? "/mon-espace" : "/tableau-de-bord",
      );
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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Connexion</h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Accédez à votre espace avec votre e-mail ou votre numéro de téléphone.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

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

        <div className="relative">
          <Input
            label="Mot de passe"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            error={fieldErrors.password || undefined}
            className="pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute top-[1.85rem] right-2 rounded p-1 text-slate-400 hover:text-slate-600"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

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
              { email: "superadmin@jeunesseparle.test", label: "Super administrateur" },
              { email: "admin@jeunesseparle.test", label: "Admin national" },
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
          <p className="mt-1.5 text-slate-500">Cliquez un compte. Mot de passe : n&apos;importe lequel.</p>
        </div>
      )}
    </div>
  );
}
