"use client";

import { useMemo, useState, type FormEvent } from "react";
import { TerritorySelect } from "@/components/forms/territory-select";
import { TagInput } from "@/components/forms/tag-input";
import { PhotoField } from "@/components/members/photo-field";
import { FingerprintCaptureField } from "@/components/members/fingerprint-capture-field";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/field";
import { usePublicStructures, useReferences } from "@/lib/hooks";
import { Stepper } from "@/components/ui/stepper";
import {
  allFingerprintsCaptured,
  emptyFingerprintMap,
  fingerprintListFromMap,
  fingerprintMapFromList,
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
  fingerprints: FingerprintCaptureMap;
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
  fingerprints: emptyFingerprintMap(),
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
    fingerprints: fingerprintListFromMap(values.fingerprints),
    confirm_duplicate: values.confirm_duplicate || undefined,
  };

  if (mode === "register") {
    payload.password = values.password;
    payload.password_confirmation = values.password_confirmation;
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
    fingerprints: fingerprintMapFromList(member.fingerprints),
  };
}

const STEPS = {
  register: ["Identité", "Contact", "Localisation", "Profil", "Compétences", "Biométrie", "Validation", "Confirmation"],
  create: ["Identité", "Contact", "Localisation", "Profil", "Appartenance", "Biométrie"],
  edit: ["Identité", "Contact", "Localisation", "Profil", "Appartenance", "Biométrie"],
} as const;

function isBiometryStep(mode: MemberFormMode, step: number) {
  if (mode === "register") return step === 5;
  return step === 5;
}

export function MemberForm({
  mode,
  initial,
  submitting,
  errors,
  duplicates,
  lockedProvince,
  submitLabel,
  onSubmit,
}: {
  mode: MemberFormMode;
  initial?: MemberFormValues;
  submitting: boolean;
  errors: Record<string, string>;
  duplicates?: DuplicateMatch[];
  lockedProvince?: boolean;
  submitLabel: string;
  onSubmit: (values: MemberFormValues) => Promise<void> | void;
}) {
  const references = useReferences();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<MemberFormValues>(initial ?? EMPTY_MEMBER_FORM);
  const [biometryError, setBiometryError] = useState<string | null>(null);
  const structures = usePublicStructures(values.province_id, values.city_id);
  const steps = STEPS[mode];

  function patch(partial: Partial<MemberFormValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  const fullName = useMemo(
    () => [values.last_name, values.middle_name, values.first_name].filter(Boolean).join(" "),
    [values.last_name, values.middle_name, values.first_name],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (step < steps.length - 1) {
      if (isBiometryStep(mode, step) && mode !== "edit" && !allFingerprintsCaptured(values.fingerprints)) {
        setBiometryError("Enregistrez les 6 empreintes (auriculaire, index, majeur — mains gauche et droite).");
        return;
      }
      setBiometryError(null);
      setStep((current) => current + 1);
      return;
    }
    if (mode !== "edit" && !allFingerprintsCaptured(values.fingerprints)) {
      setBiometryError("Les empreintes digitales sont obligatoires pour finaliser l'inscription.");
      setStep(steps.findIndex((_, i) => isBiometryStep(mode, i)));
      return;
    }
    await onSubmit(values);
  }

  const fingerprintSeed = [values.last_name, values.first_name, values.phone].filter(Boolean).join("-") || "membre";

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Stepper steps={[...steps]} current={step} onStepClick={(index) => index <= step && setStep(index)} />

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoField
            name={fullName}
            onChange={(photo) => patch({ photo })}
            error={errors.photo}
          />
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-3">
            <Input
              label="Nom"
              required
              value={values.last_name}
              onChange={(event) => patch({ last_name: event.target.value })}
              error={errors.last_name}
            />
            <Input
              label="Postnom"
              value={values.middle_name}
              onChange={(event) => patch({ middle_name: event.target.value })}
              error={errors.middle_name}
            />
            <Input
              label="Prénom"
              required
              value={values.first_name}
              onChange={(event) => patch({ first_name: event.target.value })}
              error={errors.first_name}
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
            error={errors.gender}
          />
          <Input
            label="Date de naissance"
            type="date"
            required={mode === "register"}
            value={values.birth_date}
            onChange={(event) => patch({ birth_date: event.target.value })}
            error={errors.birth_date}
          />
          <Input
            label="Lieu de naissance"
            value={values.birth_place}
            onChange={(event) => patch({ birth_place: event.target.value })}
            error={errors.birth_place}
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
            error={errors.phone}
          />
          {mode !== "register" && (
            <Input
              label="Téléphone secondaire"
              value={values.phone_alt}
              onChange={(event) => patch({ phone_alt: event.target.value })}
              error={errors.phone_alt}
            />
          )}
          <Input
            label="E-mail"
            type="email"
            value={values.email}
            onChange={(event) => patch({ email: event.target.value })}
            error={errors.email}
          />
          <Input
            label="Adresse"
            value={values.address}
            onChange={(event) => patch({ address: event.target.value })}
            error={errors.address}
            wrapperClassName="sm:col-span-2"
          />
          {mode === "register" && (
            <>
              <Input
                label="Mot de passe"
                type="password"
                required
                hint="8 caractères minimum, lettres et chiffres."
                value={values.password}
                onChange={(event) => patch({ password: event.target.value })}
                error={errors.password}
              />
              <Input
                label="Confirmation"
                type="password"
                required
                value={values.password_confirmation}
                onChange={(event) => patch({ password_confirmation: event.target.value })}
                error={errors.password_confirmation}
              />
            </>
          )}
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
            onChange={(territory) => patch({ ...territory, structure_id: null })}
            errors={errors}
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
            error={errors.structure_id}
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
            error={errors.education_level}
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
            error={errors.employment_status}
          />
          <Input
            label="Profession"
            value={values.profession}
            onChange={(event) => patch({ profession: event.target.value })}
            error={errors.profession}
          />
          <Input
            label="Domaine d'activité"
            value={values.activity_domain}
            onChange={(event) => patch({ activity_domain: event.target.value })}
            error={errors.activity_domain}
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
            error={errors.skills}
          />
          <TagInput
            label="Centres d'intérêt"
            value={values.interests}
            onChange={(interests) => patch({ interests })}
            suggestions={INTEREST_SUGGESTIONS}
            error={errors.interests}
          />
        </div>
      )}

      {step === 4 && mode !== "register" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Fonction"
            value={values.position}
            onChange={(event) => patch({ position: event.target.value })}
            error={errors.position}
          />
          <Input
            label="Date d'adhésion"
            type="date"
            value={values.joined_at}
            onChange={(event) => patch({ joined_at: event.target.value })}
            error={errors.joined_at}
          />
          <TagInput
            label="Compétences"
            value={values.skills}
            onChange={(skills) => patch({ skills })}
            suggestions={SKILL_SUGGESTIONS}
            error={errors.skills}
          />
          <TagInput
            label="Centres d'intérêt"
            value={values.interests}
            onChange={(interests) => patch({ interests })}
            suggestions={INTEREST_SUGGESTIONS}
            error={errors.interests}
          />
          <Textarea
            label="Notes internes"
            value={values.notes}
            onChange={(event) => patch({ notes: event.target.value })}
            error={errors.notes}
            wrapperClassName="sm:col-span-2"
          />
        </div>
      )}

      {step === 5 && mode === "register" && (
        <div className="space-y-4">
          <Alert tone="info" title="Enregistrement biométrique obligatoire">
            Chaque membre doit enregistrer <strong>6 empreintes</strong> : auriculaire, index et majeur sur la main
            gauche, puis la même chose sur la main droite.
          </Alert>
          <FingerprintCaptureField
            value={values.fingerprints}
            onChange={(fingerprints) => {
              patch({ fingerprints });
              setBiometryError(null);
            }}
            memberSeed={fingerprintSeed}
            error={biometryError ?? errors.fingerprints}
          />
        </div>
      )}

      {step === 6 && mode === "register" && (
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
          {errors.consent_given && <p className="text-xs text-red-600">{errors.consent_given}</p>}
        </div>
      )}

      {step === 7 && mode === "register" && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-5 text-sm">
          <p className="font-semibold text-brand-900">Confirmer votre demande</p>
          <ul className="mt-3 space-y-1.5 text-slate-700">
            <li><strong>Identité :</strong> {fullName}</li>
            <li><strong>Contact :</strong> {values.phone}{values.email ? ` · ${values.email}` : ""}</li>
            <li><strong>Compétences :</strong> {values.skills.join(", ") || "—"}</li>
            <li><strong>Biométrie :</strong> 6 empreintes enregistrées</li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            En validant, votre dossier sera transmis pour vérification par un responsable territorial.
          </p>
        </div>
      )}

      {step === 5 && mode !== "register" && (
        <div className="space-y-4">
          <Alert tone="info" title="Empreintes digitales">
            {mode === "edit"
              ? "Re-scannez les 6 empreintes si vous souhaitez mettre à jour la biométrie du membre."
              : "Enregistrez les 6 empreintes avant de valider la création du membre."}
          </Alert>
          <FingerprintCaptureField
            value={values.fingerprints}
            onChange={(fingerprints) => {
              patch({ fingerprints });
              setBiometryError(null);
            }}
            memberSeed={fingerprintSeed}
            error={biometryError ?? errors.fingerprints}
          />
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
