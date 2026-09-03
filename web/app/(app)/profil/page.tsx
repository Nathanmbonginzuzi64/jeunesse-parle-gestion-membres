"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Fingerprint, IdCard, KeyRound, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { DashboardAnimate } from "@/components/dashboard/dashboard-animate";
import { PhotoField } from "@/components/members/photo-field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fieldErrors } from "@/lib/form";
import { useToast } from "@/components/ui/toast";
import type { AuthUser } from "@/lib/types";
import { formatDate, formatRelative } from "@/lib/utils";

export default function ProfilePage() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhone(user.phone ?? "");
  }, [user]);

  if (!user) {
    return <Alert tone="info">Chargement du profil…</Alert>;
  }

  const scopeLabel = [user.scope.province, user.scope.city, user.scope.structure]
    .filter(Boolean)
    .join(" · ");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});

    const form = new FormData();
    form.append("name", name.trim());
    form.append("email", email.trim());
    form.append("phone", phone.trim());
    if (photo) form.append("photo", photo);

    try {
      const response = await api.post<{ message: string; user: AuthUser }>("/auth/profile", form);
      toast.success(response.message);
      setPhoto(null);
      await refresh();
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
      <Breadcrumb items={[{ href: "/tableau-de-bord", label: "Portail" }, { label: "Mon profil" }]} />

      <DashboardAnimate>
        <div className="relative overflow-hidden rounded-card border border-slate-700/40 bg-gradient-to-br from-slate-800 via-brand-800 to-brand-950 px-5 py-6 text-white shadow-[var(--shadow-elevated)] sm:px-8">
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-1/4 h-36 w-36 rounded-full bg-brand-400/15 blur-2xl" aria-hidden />

          <div className="relative flex flex-wrap items-center gap-5">
            <Avatar
              src={user.photo_url}
              name={user.name}
              size="xl"
              rounded="lg"
              className="ring-2 ring-white/25 shadow-lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-brand-100/90">Compte portail</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h1>
              <p className="mt-1 truncate text-sm text-brand-100/90">{user.email ?? user.phone}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {user.role?.name && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/15">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {user.role.name}
                  </span>
                )}
                {scopeLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/15">
                    <MapPin className="h-3.5 w-3.5" />
                    {scopeLabel}
                  </span>
                )}
                <Badge tone={user.is_active ? "success" : "danger"}>
                  {user.is_active ? "Actif" : "Désactivé"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DashboardAnimate>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <DashboardAnimate delay={80}>
          <Card>
            <CardHeader
              title="Identité"
              description="Ces informations apparaissent dans le portail et sur la liste des utilisateurs."
            />
            <CardBody>
              {error && (
                <Alert tone="error" className="mb-4">
                  {error}
                </Alert>
              )}
              <form onSubmit={onSubmit} className="space-y-4">
                <PhotoField
                  name={name}
                  previewUrl={user.photo_url}
                  onChange={setPhoto}
                  error={errors.photo}
                  label="Photo de profil"
                />
                <Input
                  label="Nom affiché"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  error={errors.name}
                />
                <Input
                  label="Adresse e-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                />
                <Input
                  label="Téléphone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={errors.phone}
                  hint="Utilisé comme identifiant de connexion, au même titre que l’e-mail."
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" loading={submitting}>
                    Enregistrer le profil
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </DashboardAnimate>

        <div className="space-y-6">
          <DashboardAnimate delay={120}>
            <Card>
              <CardHeader title="Sécurité" description="Gérez l’accès à votre compte." />
              <CardBody className="space-y-3">
                <Link
                  href="/compte/mot-de-passe"
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-slate-50"
                >
                  <KeyRound className="mt-0.5 h-5 w-5 text-brand-600" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">Mot de passe</span>
                    <span className="text-xs text-slate-500">Modifier le secret de connexion au portail.</span>
                  </span>
                </Link>
                <Link
                  href="/compte/biometrie"
                  className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-slate-50"
                >
                  <Fingerprint className="mt-0.5 h-5 w-5 text-brand-600" />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">Biométrie</span>
                    <span className="text-xs text-slate-500">
                      {user.fingerprint_enrolled ? "Empreinte configurée." : "Enregistrer une empreinte."}
                    </span>
                  </span>
                </Link>
                {user.member_id && (
                  <Link
                    href="/mon-espace"
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-slate-50"
                  >
                    <IdCard className="mt-0.5 h-5 w-5 text-brand-600" />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">Espace membre</span>
                      <span className="text-xs text-slate-500">Dossier adhésion, carte et code membre.</span>
                    </span>
                  </Link>
                )}
              </CardBody>
            </Card>
          </DashboardAnimate>

          <DashboardAnimate delay={160}>
            <Card>
              <CardHeader title="Compte" />
              <CardBody className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span>
                    Dernière connexion :{" "}
                    <strong className="font-medium text-slate-800">
                      {user.last_login_at ? formatRelative(user.last_login_at) : "jamais"}
                    </strong>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Compte créé le {formatDate(user.created_at) || "—"}. Le rôle et le périmètre ne peuvent être
                  modifiés que par un administrateur.
                </p>
              </CardBody>
            </Card>
          </DashboardAnimate>
        </div>
      </div>
    </div>
  );
}
