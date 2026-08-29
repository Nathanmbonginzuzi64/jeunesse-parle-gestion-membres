"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, setToken } from "@/lib/api";
import { fieldErrors, toFormData } from "@/lib/form";
import { useAuth } from "@/lib/auth";
import { ROLE_SLUGS } from "@/lib/permissions";
import {
  MemberForm,
  toMemberPayload,
  type MemberFormValues,
} from "@/components/members/member-form";
import { Alert } from "@/components/ui/feedback";
import type { AuthUser, DuplicateMatch } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicates, setDuplicates] = useState<DuplicateMatch[] | undefined>();

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
        setErrors(fieldErrors(caught));
        setError(caught.message);
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
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
        Votre dossier sera examiné par un responsable. La carte et le QR code sont générés après
        validation.
      </p>

      {error && (
        <Alert tone={duplicates?.length ? "warning" : "error"} className="mt-5">
          {error}
        </Alert>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <MemberForm
          mode="register"
          submitting={submitting}
          errors={errors}
          duplicates={duplicates}
          submitLabel="Envoyer ma demande"
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
