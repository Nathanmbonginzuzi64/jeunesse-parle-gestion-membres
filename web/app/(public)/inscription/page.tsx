"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, setToken } from "@/lib/api";
import { fieldErrors, toFormData, validationErrorMessages } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { ROLE_SLUGS } from "@/lib/permissions";
import {
  MemberForm,
  toMemberPayload,
  type MemberFormValues,
} from "@/components/members/member-form";
import { Alert } from "@/components/ui/feedback";
import type { AuthUser, DuplicateMatch } from "@/lib/types";

/** Champs → numéro d’étape du formulaire d’inscription (0-index). */
const FIELD_STEP: Record<string, number> = {
  last_name: 0,
  middle_name: 0,
  first_name: 0,
  gender: 0,
  birth_date: 0,
  birth_place: 0,
  photo: 0,
  phone: 1,
  email: 1,
  address: 1,
  province_id: 2,
  city_id: 2,
  commune_id: 2,
  zone_id: 2,
  avenue_id: 2,
  house_number: 2,
  structure_id: 2,
  education_level: 3,
  profession: 3,
  employment_status: 3,
  activity_domain: 3,
  skills: 4,
  interests: 4,
  password: 5,
  password_confirmation: 5,
  fingerprints: 6,
  webauthn_enrollment: 6,
  consent_given: 7,
};

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | undefined>();
  const [focusStep, setFocusStep] = useState(0);
  const [focusToken, setFocusToken] = useState(0);

  const errorList = useMemo(() => Object.entries(errors), [errors]);

  async function onSubmit(values: MemberFormValues) {
    setSubmitting(true);
    setError(null);
    setErrors({});

    try {
      const { api } = await import("@/lib/api");
      const response = await api.public.post<{
        token: string;
        user: AuthUser;
        member_code: string;
        message: string;
      }>("/auth/register", toFormData(toMemberPayload(values, "register")));

      setToken(response.token);
      await refresh();
      router.replace(
        response.user.role?.slug === ROLE_SLUGS.membre ? "/mon-espace" : "/tableau-de-bord",
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 409) {
        setDuplicates((caught.payload.duplicates as DuplicateMatch[]) ?? []);
        setError(caught.message);
      } else if (caught instanceof ApiError) {
        const nextErrors = fieldErrors(caught);
        setErrors(nextErrors);
        const details = validationErrorMessages(caught);
        setError(details[0] ?? caught.message);

        const firstField = Object.keys(nextErrors)[0];
        if (firstField && FIELD_STEP[firstField] !== undefined) {
          setFocusStep(FIELD_STEP[firstField]);
          setFocusToken((token) => token + 1);
        }
      } else {
        setError(
          "Impossible de contacter le serveur. Vérifiez que l'API Laravel est démarrée (port 8000).",
        );
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-xs font-medium tracking-wider text-brand-600 uppercase">Adhésion</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        Demander mon adhésion
      </h1>
      <p className="mt-1.5 text-sm text-slate-500">
        Remplissez le dossier étape par étape. Après envoi, un responsable examinera votre demande ;
        la carte membre et le QR code sont générés une fois le dossier validé.
      </p>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="font-medium text-slate-900">1.</span> Identité &amp; contact
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="font-medium text-slate-900">2.</span> Localisation &amp; profil
        </p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="font-medium text-slate-900">3.</span> Accès &amp; biométrie
        </p>
      </div>

      {error && (
        <Alert tone={duplicates?.length ? "warning" : "error"} className="mt-5" title="Demande non envoyée">
          <p>{error}</p>
          {errorList.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {errorList.map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <MemberForm
          mode="register"
          submitting={submitting}
          errors={errors}
          duplicates={duplicates}
          submitLabel="Envoyer ma demande"
          initialStep={focusStep}
          focusToken={focusToken}
          onSubmit={onSubmit}
        />
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Déjà membre ?{" "}
        <Link href="/connexion" className="font-medium text-brand-600 hover:text-brand-700">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
