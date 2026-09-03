"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Fingerprint, IdCard, KeyRound, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { PhotoField } from "@/components/members/photo-field";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export function ProfileSettingsPanel({ compactLinks = true }: { compactLinks?: boolean }) {
  const toast = useToast();
  const { user, member, refresh } = useAuth();
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
      <div className="relative overflow-hidden rounded-card border border-slate-700/40 bg-gradient-to-br from-slate-800 via-brand-800 to-brand-950 px-5 py-6 text-white shadow-[var(--shadow-elevated)] sm:px-8">
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
            <h2 className="text-2xl font-semibold tracking-tight">{user.name}</h2>
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]">
        <Card>
          <CardHeader
            title="Identité"
            description="Informations modifiables sur le portail web et mobile."
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
              />
              <Button type="submit" loading={submitting}>
                Modifier mon profil
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-6">
          {member ? (
            <Card>
              <CardHeader title="Dossier membre" description="Lecture seule — modifié par l'administration." />
              <CardBody className="space-y-2 text-sm text-slate-600">
                <p>
                  <span className="text-slate-400">ID Jeunesse Parle</span>
                  <br />
                  <strong className="font-mono text-slate-900">{member.member_code}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Nom complet</span>
                  <br />
                  <strong className="text-slate-900">{member.full_name}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Statut</span>
                  <br />
                  <Badge tone="info">{member.status_label}</Badge>
                </p>
                <p>
                  <span className="text-slate-400">Territoire</span>
                  <br />
                  {[member.province?.name, member.city?.name, member.commune?.name, member.quartier?.name]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                <p>
                  <span className="text-slate-400">Structure</span>
                  <br />
                  {member.structure?.name ?? "—"}
                </p>
                <p className="text-xs text-slate-400">
                  Inscription : {formatDate(member.joined_at ?? member.created_at) || "—"}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {compactLinks ? (
            <Card>
              <CardHeader title="Raccourcis" />
              <CardBody className="space-y-2">
                <Link href="/parametres/securite" className="flex gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <KeyRound className="h-5 w-5 text-brand-600" />
                  <span className="text-sm font-medium">Sécurité</span>
                </Link>
                <Link href="/parametres/biometrie" className="flex gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <Fingerprint className="h-5 w-5 text-brand-600" />
                  <span className="text-sm font-medium">Biométrie</span>
                </Link>
                {user.member_id ? (
                  <Link href="/parametres/ma-carte" className="flex gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                    <IdCard className="h-5 w-5 text-brand-600" />
                    <span className="text-sm font-medium">Ma carte</span>
                  </Link>
                ) : null}
                <p className="flex items-center gap-2 pt-2 text-xs text-slate-500">
                  <UserRound className="h-3.5 w-3.5" />
                  Dernière connexion : {user.last_login_at ? formatRelative(user.last_login_at) : "jamais"}
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
