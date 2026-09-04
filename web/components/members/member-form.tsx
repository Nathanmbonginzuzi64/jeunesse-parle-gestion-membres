"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { TerritorySelect } from "@/components/forms/territory-select";
import { TagInput } from "@/components/forms/tag-input";
import { PhotoField } from "@/components/members/photo-field";
import { BiometricEnrollmentField } from "@/components/members/biometric-enrollment-field";
import { FingerprintCaptureField } from "@/components/members/fingerprint-capture-field";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { usePublicStructures, useReferences, useTerritories } from "@/lib/hooks";
import { Stepper } from "@/components/ui/stepper";
import { PasswordStrength } from "@/components/ui/password-strength";
import { hasWebAuthnEnrollment, type WebAuthnEnrollmentPayload } from "@/lib/biometrics/types";
import {
  allFingerprintsCaptured,
  emptyFingerprintMap,
  fingerprintListFromMap,
  type FingerprintCaptureMap,
} from "@/lib/fingerprints";
import type { DuplicateMatch, Member } from "@/lib/types";

const SKILL_SUGGESTIONS = [
  "Leadership",
  "Communication",
  "Informatique",
  "Agriculture",
  "Santé",
  "Éducation",
  "Médias",
  "Sport",
  "Arts",
  "Entrepreneuriat",
];

const INTEREST_SUGGESTIONS = [
  "Citoyenneté",
  "Environnement",
  "Culture",
  "Innovation",
  "Paix",
  "Genre",
  "Emploi",
];

export interface MemberFormValues {
  last_name: string;
  middle_name: string;
  first_name: string;
  gender: "" | "M" | "F";
  birth_date: string;
  birth_place: string;
  phone: string;
  phone_alt: string;
  email: string;
  address: string;
  house_number: string;
  avenue_id: number | null;
  password: string;
  password_confirmation: string;
  province_id: number | null;
  city_id: number | null;
  district_id: number | null;
  commune_id: number | null;
  zone_id: number | null;
  structure_id: number | null;
  education_level: string;
  profession: string;
  employment_status: string;
  activity_domain: string;
  skills: string[];
  interests: string[];
  position: string;
  joined_at: string;
  notes: string;
  consent_given: boolean;
  photo: File | null;
  photo_url: string | null;
  has_portal_account: boolean;
  webauthnEnrollment: WebAuthnEnrollmentPayload | null;
  fingerprints: FingerprintCaptureMap;
  existingBiometricEnrolled: boolean;
  /** Édition : null = non choisi, true = remplacer, false = conserver */
  replaceBiometric: boolean | null;
  confirm_duplicate: boolean;
}

export type MemberFormMode = "register" | "create" | "edit";

export const EMPTY_MEMBER_FORM: MemberFormValues = {
  last_name: "",
  middle_name: "",
  first_name: "",
  gender: "",
  birth_date: "",
  birth_place: "",
  phone: "",
  phone_alt: "",
  email: "",
  address: "",
  house_number: "",
  avenue_id: null as number | null,
  password: "",
  password_confirmation: "",
  province_id: null,
  city_id: null,
  district_id: null,
  commune_id: null,
  zone_id: null,
  structure_id: null,
  education_level: "",
  profession: "",
  employment_status: "",
  activity_domain: "",
  skills: [],
  interests: [],
  position: "",
  joined_at: "",
  notes: "",
  consent_given: false,
  photo: null,
  photo_url: null,
  has_portal_account: false,
  webauthnEnrollment: null,
  fingerprints: emptyFingerprintMap(),
  existingBiometricEnrolled: false,
  replaceBiometric: null,
  confirm_duplicate: false,
};

export function toMemberPayload(values: MemberFormValues, mode: MemberFormMode): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    last_name: values.last_name.trim(),
    middle_name: values.middle_name.trim() || null,
    first_name: values.first_name.trim(),
    gender: values.gender || null,
    birth_date: values.birth_date || null,
    birth_place: values.birth_place.trim() || null,
    phone: values.phone.trim(),
    email: values.email.trim() || null,
    address: values.address.trim() || null,
    house_number: values.house_number.trim() || null,
    avenue_id: values.avenue_id,
    province_id: values.province_id,
    city_id: values.city_id,
    district_id: values.district_id,
    commune_id: values.commune_id,
    zone_id: values.zone_id,
    structure_id: values.structure_id,
    education_level: values.education_level || null,
    profession: values.profession.trim() || null,
    employment_status: values.employment_status || null,
    activity_domain: values.activity_domain.trim() || null,
    skills: values.skills,
    interests: values.interests,
    photo: values.photo,
    confirm_duplicate: values.confirm_duplicate || undefined,
  };

  if (values.webauthnEnrollment) {
    payload.webauthn_enrollment = values.webauthnEnrollment;
  }

  if (allFingerprintsCaptured(values.fingerprints ?? emptyFingerprintMap())) {
    payload.fingerprints = fingerprintListFromMap(values.fingerprints).map((item) => ({
      slot: item.slot,
      template_hash: item.template_hash,
      hand: item.hand,
      finger: item.finger,
      captured_at: item.captured_at,
    }));
  }

  if (mode === "register" || mode === "create") {
    payload.password = values.password;
    payload.password_confirmation = values.password_confirmation;
  }

  if (mode === "edit" && values.password) {
    payload.password = values.password;
    payload.password_confirmation = values.password_confirmation;
  }

  if (mode === "register") {
    payload.consent_given = values.consent_given;
  } else {
    payload.phone_alt = values.phone_alt.trim() || null;
    payload.position = values.position.trim() || null;
    payload.joined_at = values.joined_at || null;
    payload.notes = values.notes.trim() || null;
  }

  return payload;
}

export function valuesFromMember(member: Member): MemberFormValues {
  return {
    ...EMPTY_MEMBER_FORM,
    last_name: member.last_name ?? "",
    middle_name: member.middle_name ?? "",
    first_name: member.first_name ?? "",
    gender: member.gender ?? "",
    birth_date: member.birth_date ?? "",
    birth_place: member.birth_place ?? "",
    phone: member.phone ?? "",
    phone_alt: member.phone_alt ?? "",
    email: member.email ?? "",
    address: member.address ?? "",
    house_number: member.house_number ?? "",
    avenue_id: member.avenue?.id ?? null,
    province_id: member.province?.id ?? null,
    city_id: member.city?.id ?? null,
    district_id: member.district?.id ?? null,
    commune_id: member.commune?.id ?? null,
    zone_id: member.quartier?.id ?? member.zone?.id ?? null,
    structure_id: member.structure?.id ?? null,
    education_level: member.education_level ?? "",
    profession: member.profession ?? "",
    employment_status: member.employment_status ?? "",
    activity_domain: member.activity_domain ?? "",
    skills: member.skills ?? [],
    interests: member.interests ?? [],
    position: member.position ?? "",
    joined_at: member.joined_at ?? "",
    notes: member.notes ?? "",
    consent_given: member.consent_given ?? false,
    photo_url: member.photo_url ?? null,
    has_portal_account: member.has_portal_account ?? false,
    webauthnEnrollment: null,
    fingerprints: emptyFingerprintMap(),
    existingBiometricEnrolled: Boolean(member.fingerprint_enrolled),
    replaceBiometric: null,
  };
}

const STEPS = {
  register: ["Identité", "Contact", "Localisation", "Profil", "Compétences", "Accès portail", "Biométrie", "Validation", "Confirmation"],
  create: ["Identité", "Contact", "Localisation", "Profil", "Appartenance", "Accès portail", "Biométrie"],
  edit: ["Identité", "Contact", "Localisation", "Profil", "Appartenance", "Accès portail", "Biométrie"],
} as const;

function isPortalAccessStep(mode: MemberFormMode, step: number) {
  return (mode === "register" || mode === "create" || mode === "edit") && step === 5;
}

function isBiometryStep(mode: MemberFormMode, step: number) {
  if (mode === "edit") return step === 6;
  if (mode === "register" || mode === "create") return step === 6;
  return false;
}

function normalizePhoneInput(phone: string): string {
  return phone.replace(/[\s().-]+/g, "");
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(normalizePhoneInput(phone));
}

function passwordMeetsPolicy(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

function validateRegisterStep(
  step: number,
  values: MemberFormValues,
): { field?: string; message: string } | null {
  if (step === 0) {
    if (!values.last_name.trim()) return { field: "last_name", message: "Le nom est obligatoire." };
    if (!values.first_name.trim()) return { field: "first_name", message: "Le prénom est obligatoire." };
    if (!values.gender) return { field: "gender", message: "Indiquez votre sexe." };
    if (!values.birth_date) {
      return { field: "birth_date", message: "La date de naissance est obligatoire." };
    }
  }
  if (step === 1) {
    if (!values.phone.trim()) return { field: "phone", message: "Le téléphone est obligatoire." };
    if (!isValidPhone(values.phone)) {
      return {
        field: "phone",
        message: "Le téléphone doit contenir entre 9 et 15 chiffres (ex. +243…).",
      };
    }
    if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      return { field: "email", message: "L'adresse e-mail n'est pas valide." };
    }
  }
  if (step === 2 && !values.province_id) {
    return { field: "province_id", message: "Sélectionnez votre province." };
  }
  if (step === 7 && !values.consent_given) {
    return {
      field: "consent_given",
      message: "Acceptez le traitement de vos données pour continuer.",
    };
  }
  return null;
}

export function MemberForm({
  mode,
  initial,
  submitting,
  errors,
  duplicates,
  lockedProvince,
  submitLabel,
  initialStep = 0,
  focusToken,
  onSubmit,
}: {
  mode: MemberFormMode;
  initial?: MemberFormValues;
  submitting: boolean;
  errors: Record<string, string>;
  duplicates?: DuplicateMatch[];
  lockedProvince?: boolean;
  submitLabel: string;
  /** Étape de départ (ex. après erreur API). */
  initialStep?: number;
  /** Incrémenté pour forcer le retour à initialStep sans remonter le formulaire. */
  focusToken?: number;
  onSubmit: (values: MemberFormValues) => Promise<void> | void;
}) {
  const references = useReferences();
  const [step, setStep] = useState(() => Math.max(0, initialStep));
  const [values, setValues] = useState<MemberFormValues>(initial ?? EMPTY_MEMBER_FORM);
  const [biometryError, setBiometryError] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const structures = usePublicStructures(values.province_id, values.city_id);
  const steps = STEPS[mode];
  const fieldErrors = { ...localErrors, ...errors };

  useEffect(() => {
    if (focusToken === undefined) return;
    if (initialStep >= 0 && initialStep < steps.length) {
      setStep(initialStep);
    }
  }, [focusToken, initialStep, steps.length]);

  function patch(partial: Partial<MemberFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
    setStepError(null);
    const cleared = Object.keys(partial);
    if (cleared.length) {
      setLocalErrors((current) => {
        const next = { ...current };
        for (const key of cleared) delete next[key];
        return next;
      });
    }
  }

  const fullName = useMemo(
    () => [values.last_name, values.middle_name, values.first_name].filter(Boolean).join(" "),
    [values.last_name, values.middle_name, values.first_name],
  );

  const biometricDisplayName = fullName || "Nouveau membre";
  const biometricUserName = values.phone || values.email || biometricDisplayName;
  const memberSeed = values.phone || values.email || biometricDisplayName;
  const hasFingerprintCapture = allFingerprintsCaptured(values.fingerprints);
  const hasBiometric =
    hasWebAuthnEnrollment(values.webauthnEnrollment) || hasFingerprintCapture;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (step < steps.length - 1) {
      if (mode === "register") {
        const invalid = validateRegisterStep(step, values);
        if (invalid) {
          setStepError(invalid.message);
          if (invalid.field) setLocalErrors({ [invalid.field]: invalid.message });
          return;
        }
      }

      if (isPortalAccessStep(mode, step)) {
        const requiresPassword = mode === "register" || mode === "create" || !values.has_portal_account;
        const hasPasswordInput = Boolean(values.password || values.password_confirmation);

        if (requiresPassword && !values.password) {
          setPortalError("Le mot de passe est requis pour l'accès au portail.");
          return;
        }

        if (hasPasswordInput || requiresPassword) {
          if (!passwordMeetsPolicy(values.password)) {
            setPortalError("Le mot de passe doit contenir au moins 8 caractères, avec des lettres et des chiffres.");
            return;
          }
          if (values.password !== values.password_confirmation) {
            setPortalError("La confirmation du mot de passe ne correspond pas.");
            return;
          }
        }
      }
      if (isBiometryStep(mode, step)) {
        if (mode === "edit" && values.existingBiometricEnrolled) {
          if (values.replaceBiometric === null) {
            setBiometryError("Indiquez si vous souhaitez changer l'empreinte du membre.");
            return;
          }
          if (values.replaceBiometric === true && !hasBiometric) {
            setBiometryError("Enregistrez Windows Hello ou les 6 empreintes avant de continuer.");
            return;
          }
        } else if (mode !== "edit" && !hasBiometric) {
          setBiometryError("Enregistrez Windows Hello ou le lecteur DigitalPersona avant de continuer.");
          return;
        }
      }
      setPortalError(null);
      setBiometryError(null);
      setStepError(null);
      setLocalErrors({});
      setStep((current) => current + 1);
      return;
    }
    if (mode === "register" && !values.consent_given) {
      setStepError("Acceptez le traitement de vos données pour envoyer la demande.");
      setStep(7);
      return;
    }
    if (
      mode === "edit" &&
      values.existingBiometricEnrolled &&
      values.replaceBiometric === null
    ) {
      setBiometryError("Indiquez si vous souhaitez changer l'empreinte du membre.");
      setStep(steps.findIndex((_, i) => isBiometryStep(mode, i)));
      return;
    }
    if (mode === "edit" && values.existingBiometricEnrolled && values.replaceBiometric === true && !hasBiometric) {
      setBiometryError("Enregistrez Windows Hello ou les 6 empreintes avant d'enregistrer.");
      setStep(steps.findIndex((_, i) => isBiometryStep(mode, i)));
      return;
    }
    if (mode !== "edit" && !hasBiometric) {
      setBiometryError("La biométrie (Hello ou DigitalPersona) est obligatoire pour finaliser.");
      setStep(steps.findIndex((_, i) => isBiometryStep(mode, i)));
      return;
    }
    if (mode === "register" || mode === "create") {
      if (!passwordMeetsPolicy(values.password) || values.password !== values.password_confirmation) {
        setPortalError("Vérifiez le mot de passe (8 caractères min., lettres et chiffres).");
        setStep(5);
        return;
      }
    }
    await onSubmit({
      ...values,
      phone: normalizePhoneInput(values.phone),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Stepper steps={[...steps]} current={step} onStepClick={(index) => index <= step && setStep(index)} />

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoField
            name={fullName}
            previewUrl={values.photo_url}
            onChange={(photo) => patch({ photo })}
            error={fieldErrors.photo}
          />
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
            <Input
              label="Nom"
              required
              value={values.last_name}
              onChange={(event) => patch({ last_name: event.target.value })}
              error={fieldErrors.last_name}
            />
            <Input
              label="Postnom"
              value={values.middle_name}
              onChange={(event) => patch({ middle_name: event.target.value })}
              error={fieldErrors.middle_name}
            />
            <Input
              label="Prénom"
              required
              value={values.first_name}
              onChange={(event) => patch({ first_name: event.target.value })}
              error={fieldErrors.first_name}
            />
          </div>
          <Select
            label="Sexe"
            required
            placeholder="Sélectionner"
            value={values.gender}
            onChange={(event) => patch({ gender: event.target.value as "M" | "F" | "" })}
            options={references?.genders ?? [
              { value: "M", label: "Masculin" },
              { value: "F", label: "Féminin" },
            ]}
            error={fieldErrors.gender}
          />
          <Input
            label="Date de naissance"
            type="date"
            required={mode === "register"}
            value={values.birth_date}
            onChange={(event) => patch({ birth_date: event.target.value })}
            error={fieldErrors.birth_date}
          />
          <Input
            label="Lieu de naissance"
            value={values.birth_place}
            onChange={(event) => patch({ birth_place: event.target.value })}
            error={fieldErrors.birth_place}
            wrapperClassName="sm:col-span-2"
          />
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Téléphone"
            required
            value={values.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder="+243 …"
            error={fieldErrors.phone}
          />
          {mode !== "register" && mode !== "create" && (
            <Input
              label="Téléphone secondaire"
              value={values.phone_alt}
              onChange={(event) => patch({ phone_alt: event.target.value })}
              error={fieldErrors.phone_alt}
            />
          )}
          <Input
            label="E-mail"
            type="email"
            value={values.email}
            onChange={(event) => patch({ email: event.target.value })}
            error={fieldErrors.email}
          />
          <Input
            label="Adresse"
            value={values.address}
            onChange={(event) => patch({ address: event.target.value })}
            error={fieldErrors.address}
            wrapperClassName="sm:col-span-2"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <TerritorySelect
            required
            lockedProvince={lockedProvince}
            value={{
              province_id: values.province_id,
              city_id: values.city_id,
              district_id: values.district_id,
              commune_id: values.commune_id,
              zone_id: values.zone_id,
            }}
            onChange={(territory) => patch({ ...territory, structure_id: null, avenue_id: null })}
            errors={fieldErrors}
          />
          <MemberAvenueField
            zoneId={values.zone_id}
            value={values.avenue_id}
            onChange={(avenue_id) => patch({ avenue_id })}
            error={fieldErrors.avenue_id}
          />
          <Input
            label="Numéro d'habitation"
            value={values.house_number}
            onChange={(event) => patch({ house_number: event.target.value })}
            error={fieldErrors.house_number}
            placeholder="Ex. 12, parcelle B"
          />
          <Select
            label="Structure"
            placeholder={values.province_id ? "Sélectionner (facultatif)" : "Choisir d'abord la province"}
            disabled={!values.province_id}
            value={values.structure_id ?? ""}
            onChange={(event) =>
              patch({ structure_id: event.target.value ? Number(event.target.value) : null })
            }
            options={structures.map((structure) => ({ value: structure.id, label: structure.name }))}
            error={fieldErrors.structure_id}
          />
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Niveau d'études"
            placeholder="Sélectionner"
            value={values.education_level}
            onChange={(event) => patch({ education_level: event.target.value })}
            options={(references?.education_levels ?? []).map((level) => ({ value: level, label: level }))}
            error={fieldErrors.education_level}
          />
          <Select
            label="Situation professionnelle"
            placeholder="Sélectionner"
            value={values.employment_status}
            onChange={(event) => patch({ employment_status: event.target.value })}
            options={(references?.employment_statuses ?? []).map((status) => ({
              value: status,
              label: status,
            }))}
            error={fieldErrors.employment_status}
          />
          <Input
            label="Profession"
            value={values.profession}
            onChange={(event) => patch({ profession: event.target.value })}
            error={fieldErrors.profession}
          />
          <Input
            label="Domaine d'activité"
            value={values.activity_domain}
            onChange={(event) => patch({ activity_domain: event.target.value })}
            error={fieldErrors.activity_domain}
          />
        </div>
      )}

      {step === 4 && mode === "register" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <TagInput
            label="Compétences"
            value={values.skills}
            onChange={(skills) => patch({ skills })}
            suggestions={SKILL_SUGGESTIONS}
            error={fieldErrors.skills}
          />
          <TagInput
            label="Centres d'intérêt"
            value={values.interests}
            onChange={(interests) => patch({ interests })}
            suggestions={INTEREST_SUGGESTIONS}
            error={fieldErrors.interests}
          />
        </div>
      )}

      {step === 4 && mode !== "register" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Fonction"
            value={values.position}
            onChange={(event) => patch({ position: event.target.value })}
            error={fieldErrors.position}
          />
          <Input
            label="Date d'adhésion"
            type="date"
            value={values.joined_at}
            onChange={(event) => patch({ joined_at: event.target.value })}
            error={fieldErrors.joined_at}
          />
          <TagInput
            label="Compétences"
            value={values.skills}
            onChange={(skills) => patch({ skills })}
            suggestions={SKILL_SUGGESTIONS}
            error={fieldErrors.skills}
          />
          <TagInput
            label="Centres d'intérêt"
            value={values.interests}
            onChange={(interests) => patch({ interests })}
            suggestions={INTEREST_SUGGESTIONS}
            error={fieldErrors.interests}
          />
          <Textarea
            label="Notes internes"
            value={values.notes}
            onChange={(event) => patch({ notes: event.target.value })}
            error={fieldErrors.notes}
            wrapperClassName="sm:col-span-2"
          />
        </div>
      )}

      {step === 5 && (mode === "register" || mode === "create" || mode === "edit") && (
        <div className="space-y-4">
          <Alert tone="info" title="Accès au portail membre">
            {mode === "edit" ? (
              values.has_portal_account ? (
                <>
                  Ce membre possède déjà un compte portail. Laissez les champs vides pour conserver le mot de passe
                  actuel, ou définissez un nouveau mot de passe provisoire (le membre devra le changer à la prochaine
                  connexion).
                </>
              ) : (
                <>
                  Aucun compte portail n&apos;est associé à ce membre. Définissez un mot de passe pour créer
                  automatiquement son accès au portail web ou mobile.
                </>
              )
            ) : mode === "create" ? (
              "Un compte portail (rôle membre) sera créé automatiquement. Le membre pourra se connecter avec son téléphone ou e-mail et ce mot de passe provisoire, puis confirmer son empreinte déjà enregistrée à la première connexion."
            ) : (
              "Un compte portail membre sera créé automatiquement. Choisissez un mot de passe pour accéder à votre espace ; votre empreinte enregistrée sera confirmée à la première connexion."
            )}
          </Alert>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Mot de passe"
              type="password"
              required={mode !== "edit" || !values.has_portal_account}
              hint="8 caractères minimum, lettres et chiffres."
              value={values.password}
              onChange={(event) => {
                patch({ password: event.target.value });
                setPortalError(null);
              }}
              error={fieldErrors.password ?? portalError ?? undefined}
            />
            <Input
              label="Confirmation"
              type="password"
              required={mode !== "edit" || !values.has_portal_account}
              value={values.password_confirmation}
              onChange={(event) => {
                patch({ password_confirmation: event.target.value });
                setPortalError(null);
              }}
              error={fieldErrors.password_confirmation}
            />
          </div>
          <PasswordStrength password={values.password} />
          {portalError && <p className="text-xs text-red-600">{portalError}</p>}
        </div>
      )}

      {step === 6 && mode === "register" && (
        <div className="space-y-4">
          <Alert tone="info" title="Enregistrement biométrique obligatoire">
            Configurez <strong>Windows Hello</strong> et/ou capturez les <strong>6 empreintes</strong> via
            DigitalPersona. Au moins une méthode est requise.
          </Alert>
          <BiometricEnrollmentField
            value={values.webauthnEnrollment}
            onChange={(webauthnEnrollment) => {
              patch({ webauthnEnrollment });
              setBiometryError(null);
            }}
            displayName={biometricDisplayName}
            userName={biometricUserName}
            error={biometryError ?? fieldErrors.webauthn_enrollment}
          />
          <FingerprintCaptureField
            value={values.fingerprints}
            onChange={(fingerprints) => {
              patch({ fingerprints });
              setBiometryError(null);
            }}
            memberSeed={memberSeed}
            error={fieldErrors.fingerprints}
          />
        </div>
      )}

      {step === 7 && mode === "register" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-900">{fullName || "Profil incomplet"}</p>
            <p className="mt-1 text-slate-500">
              {values.phone || "Téléphone non renseigné"}
              {values.email ? ` · ${values.email}` : ""}
            </p>
          </div>
          <Checkbox
            required
            checked={values.consent_given}
            onChange={(event) => patch({ consent_given: event.target.checked })}
            label="J'accepte le traitement de mes données pour l'adhésion à Jeunesse Parle."
            description="Seules les informations nécessaires à l'identification et à la mobilisation sont collectées."
          />
          {fieldErrors.consent_given && <p className="text-xs text-red-600">{fieldErrors.consent_given}</p>}
        </div>
      )}

      {step === 8 && mode === "register" && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5 text-sm">
          <p className="font-semibold text-brand-900">Confirmer votre demande</p>
          <ul className="mt-3 space-y-1.5 text-slate-700">
            <li><strong>Identité :</strong> {fullName}</li>
            <li><strong>Contact :</strong> {values.phone}{values.email ? ` · ${values.email}` : ""}</li>
            <li><strong>Compétences :</strong> {values.skills.join(", ") || "—"}</li>
            <li><strong>Accès portail :</strong> Mot de passe défini</li>
            <li><strong>Biométrie :</strong> {hasBiometric ? "Configurée" : "À compléter"}</li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            En validant, votre dossier sera transmis pour vérification par un responsable territorial.
          </p>
        </div>
      )}

      {step === 6 && mode === "create" && (
        <div className="space-y-4">
          <Alert tone="info" title="Biométrie du membre">
            Enregistrez Windows Hello et/ou les empreintes DigitalPersona avant la création du dossier.
          </Alert>
          <BiometricEnrollmentField
            value={values.webauthnEnrollment}
            onChange={(webauthnEnrollment) => {
              patch({ webauthnEnrollment });
              setBiometryError(null);
            }}
            displayName={biometricDisplayName}
            userName={biometricUserName}
            error={biometryError ?? fieldErrors.webauthn_enrollment}
          />
          <FingerprintCaptureField
            value={values.fingerprints}
            onChange={(fingerprints) => {
              patch({ fingerprints });
              setBiometryError(null);
            }}
            memberSeed={memberSeed}
            error={fieldErrors.fingerprints}
          />
        </div>
      )}

      {step === 6 && mode === "edit" && (
        <div className="space-y-4">
          <Alert tone="info" title="Biométrie du membre">
            {values.existingBiometricEnrolled
              ? "Ce membre possède déjà une empreinte enregistrée. Souhaitez-vous la remplacer ?"
              : "Aucune empreinte n'est enregistrée. Vous pouvez en ajouter une (Hello et/ou DigitalPersona)."}
          </Alert>

          {values.existingBiometricEnrolled && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant={values.replaceBiometric === false ? "default" : "outline"}
                className="h-auto min-h-11 whitespace-normal py-2.5 text-left"
                onClick={() => {
                  patch({
                    replaceBiometric: false,
                    webauthnEnrollment: null,
                    fingerprints: emptyFingerprintMap(),
                  });
                  setBiometryError(null);
                }}
              >
                Non — conserver l&apos;empreinte actuelle
              </Button>
              <Button
                type="button"
                variant={values.replaceBiometric === true ? "default" : "outline"}
                className="h-auto min-h-11 whitespace-normal py-2.5 text-left"
                onClick={() => {
                  patch({ replaceBiometric: true, webauthnEnrollment: null });
                  setBiometryError(null);
                }}
              >
                Oui — enregistrer une nouvelle empreinte
              </Button>
            </div>
          )}

          {values.replaceBiometric === false && (
            <Alert tone="success">L&apos;empreinte actuelle sera conservée.</Alert>
          )}

          {(values.replaceBiometric === true || !values.existingBiometricEnrolled) && (
            <>
              <BiometricEnrollmentField
                value={values.webauthnEnrollment}
                onChange={(webauthnEnrollment) => {
                  patch({ webauthnEnrollment });
                  setBiometryError(null);
                }}
                displayName={biometricDisplayName}
                userName={biometricUserName}
                error={biometryError ?? fieldErrors.webauthn_enrollment}
              />
              <FingerprintCaptureField
                value={values.fingerprints}
                onChange={(fingerprints) => {
                  patch({ fingerprints });
                  setBiometryError(null);
                }}
                memberSeed={memberSeed}
                error={fieldErrors.fingerprints}
              />
            </>
          )}

          {biometryError && values.replaceBiometric !== true && values.existingBiometricEnrolled && (
            <p className="text-xs text-red-600">{biometryError}</p>
          )}
        </div>
      )}

      {duplicates && duplicates.length > 0 && (
        <Alert tone="warning" title="Un membre potentiellement similaire existe déjà.">
          <ul className="mt-2 space-y-1">
            {duplicates.map((match) => (
              <li key={match.id}>
                {match.full_name} · {match.member_code}
                {match.reason ? ` — ${match.reason}` : ""}
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <Checkbox
              checked={values.confirm_duplicate}
              onChange={(event) => patch({ confirm_duplicate: event.target.checked })}
              label="Je confirme qu'il s'agit d'une nouvelle personne."
            />
          </div>
        </Alert>
      )}

      {stepError && (
        <Alert tone="error" title="Complétez cette étape">
          {stepError}
        </Alert>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Retour
        </Button>
        <Button type="submit" loading={submitting}>
          {step < steps.length - 1 ? "Continuer" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function MemberAvenueField({
  zoneId,
  value,
  onChange,
  error,
}: {
  zoneId: number | null;
  value: number | null;
  onChange: (id: number | null) => void;
  error?: string;
}) {
  const { avenues } = useTerritories(null, null, null, null, zoneId);

  return (
    <Select
      label="Avenue"
      placeholder={zoneId ? "Sélectionner" : "Choisir d'abord le quartier"}
      disabled={!zoneId}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      options={avenues.map((avenue) => ({ value: avenue.id, label: avenue.name }))}
      error={error}
    />
  );
}
