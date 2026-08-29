"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FingerprintCaptureField } from "@/components/members/fingerprint-capture-field";
import { PhotoField } from "@/components/members/photo-field";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Checkbox } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { PasswordStrength } from "@/components/ui/password-strength";
import { TerritorySelect } from "@/components/forms/territory-select";
import { api, ApiError } from "@/lib/api";
import { fieldErrors, toFormData } from "@/lib/form";
import {
  allFingerprintsCaptured,
  capturedFingerprintCount,
  emptyFingerprintMap,
  fingerprintListFromMap,
  fingerprintMapFromList,
  type FingerprintCaptureMap,
} from "@/lib/fingerprints";
import { useApi, usePublicStructures } from "@/lib/hooks";
import { ROLE_SLUGS } from "@/lib/permissions";
import type { AuthUser, RoleDetail } from "@/lib/types";

function territoryLevel(slug: string | undefined) {
  if (!slug || slug === ROLE_SLUGS.superAdmin || slug === ROLE_SLUGS.adminNational || slug === ROLE_SLUGS.agentVerification) {
    return "none" as const;
  }
  if (slug === ROLE_SLUGS.responsableProvincial) return "province" as const;
  if (slug === ROLE_SLUGS.responsableVille) return "city" as const;
  return "full" as const;
}

export function UserFormDialog({
  open,
  onClose,
  user,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user?: AuthUser | null;
  onSaved: (message: string) => void;
}) {
  const editing = Boolean(user);
  const roles = useApi<{ data: RoleDetail[] }>(open ? "/roles" : null);
  const [step, setStep] = useState<"account" | "biometry">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [roleId, setRoleId] = useState("");
  const [enableBiometry, setEnableBiometry] = useState(false);
  const [fingerprints, setFingerprints] = useState<FingerprintCaptureMap>(emptyFingerprintMap());
  const [biometryError, setBiometryError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });
  const [structureId, setStructureId] = useState<number | null>(null);

  const selectedRole = useMemo(
    () => roles.data?.data.find((role) => String(role.id) === roleId),
    [roles.data?.data, roleId],
  );
  const level = territoryLevel(selectedRole?.slug);
  const structures = usePublicStructures(territory.province_id, territory.city_id);
  const fingerprintSeed = [email, name, phone].filter(Boolean).join("-") || "utilisateur";

  useEffect(() => {
    if (!open) return;
    setStep("account");
    if (user) {
      setName(user.name);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setPassword("");
      setPhoto(null);
      setRoleId(String(roles.data?.data.find((r) => r.slug === user.role?.slug)?.id ?? ""));
      setEnableBiometry(Boolean(user.fingerprint_enrolled));
      setFingerprints(fingerprintMapFromList(user.fingerprints));
      setTerritory({
        province_id: user.scope.province_id,
        city_id: user.scope.city_id,
        district_id: null,
        commune_id: user.scope.commune_id,
        zone_id: null,
      });
      setStructureId(user.scope.structure_id);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setPhoto(null);
      setRoleId("");
      setEnableBiometry(false);
      setFingerprints(emptyFingerprintMap());
      setTerritory({ province_id: null, city_id: null, district_id: null, commune_id: null, zone_id: null });
      setStructureId(null);
    }
    setBiometryError(null);
    setErrors({});
  }, [open, user, roles.data?.data]);

  function handleClose() {
    onClose();
  }

  function goToBiometry(event: FormEvent) {
    event.preventDefault();
    setBiometryError(null);
    setErrors({});
    if (!name.trim() || !email.trim() || !roleId) return;
    if (!editing && !password) {
      setErrors({ password: "Mot de passe requis." });
      return;
    }
    if (enableBiometry) {
      setStep("biometry");
    } else {
      void submitAccount();
    }
  }

  async function submitAccount() {
    setSubmitting(true);
    setErrors({});
    setBiometryError(null);

    if (enableBiometry && !allFingerprintsCaptured(fingerprints)) {
      setBiometryError("Enregistrez les 6 empreintes pour activer la connexion biométrique.");
      setSubmitting(false);
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      email,
      phone: phone || null,
      role_id: Number(roleId),
      province_id: level !== "none" ? territory.province_id : null,
      city_id: level === "city" || level === "full" ? territory.city_id : null,
      commune_id: level === "full" ? territory.commune_id : null,
      structure_id: level === "full" ? structureId : null,
    };
    if (!editing) {
      payload.password = password;
      payload.password_confirmation = password;
    }
    if (photo) {
      payload.photo = photo;
    }
    if (enableBiometry && allFingerprintsCaptured(fingerprints)) {
      payload.fingerprints = fingerprintListFromMap(fingerprints);
    } else if (!enableBiometry) {
      payload.fingerprint_enrollment = "0";
    }

    try {
      const body = toFormData(payload);
      const response = editing
        ? await api.patch<{ message: string }>(`/users/${user!.id}`, body)
        : await api.post<{ message: string }>("/users", body);
      onSaved(response.message);
      handleClose();
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(fieldErrors(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={editing ? "Modifier le compte" : "Nouveau compte"}
      description={
        step === "biometry"
          ? "Enregistrement biométrique — connexion par empreinte"
          : editing
            ? user?.email ?? undefined
            : "Administrateur, responsable territorial ou agent."
      }
      size="lg"
    >
      {step === "account" ? (
        <form onSubmit={goToBiometry} className="space-y-4">
          <PhotoField
            name={name || "Utilisateur"}
            previewUrl={user?.photo_url}
            onChange={setPhoto}
            error={errors.photo}
          />
          <Input label="Nom complet" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Input
                label="Mot de passe temporaire"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <PasswordStrength password={password} />
            </div>
          )}
          <Select
            label="Rôle"
            required
            placeholder="Sélectionner"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            options={(roles.data?.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
            error={errors.role_id}
          />
          {level === "province" && (
            <TerritorySelect
              value={territory}
              onChange={setTerritory}
              errors={errors}
              levels={{ city: false, district: false, commune: false, zone: false }}
            />
          )}
          {level === "city" && (
            <TerritorySelect value={territory} onChange={setTerritory} errors={errors} levels={{ district: false, commune: false, zone: false }} />
          )}
          {level === "full" && (
            <>
              <TerritorySelect value={territory} onChange={(value) => { setTerritory(value); setStructureId(null); }} errors={errors} levels={{ zone: false }} />
              <Select
                label="Structure"
                placeholder="Sélectionner"
                value={structureId ?? ""}
                onChange={(e) => setStructureId(e.target.value ? Number(e.target.value) : null)}
                options={structures.map((s) => ({ value: s.id, label: s.name }))}
                error={errors.structure_id}
              />
            </>
          )}

          <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
            <Checkbox
              checked={enableBiometry}
              onChange={(e) => {
                setEnableBiometry(e.target.checked);
                if (!e.target.checked) setFingerprints(emptyFingerprintMap());
              }}
              label="Activer la connexion par empreinte digitale"
            />
            <p className="mt-2 text-xs text-slate-600">
              Si activé, l&apos;utilisateur pourra se connecter via son empreinte (compte actif uniquement).
              {user?.fingerprint_enrolled && (
                <span className="block mt-1 text-brand-700">
                  Biométrie actuelle : {capturedFingerprintCount(fingerprints)}/6 doigts.
                </span>
              )}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit">
              {enableBiometry ? "Continuer — Biométrie" : editing ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <Alert tone="info">
            Enregistrez les 6 empreintes (auriculaire, index, majeur — mains G/D). Elles permettront la connexion
            si le compte reste <strong>actif</strong>.
          </Alert>
          <FingerprintCaptureField
            value={fingerprints}
            onChange={setFingerprints}
            memberSeed={fingerprintSeed}
            error={biometryError ?? errors.fingerprints}
          />
          <div className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("account")}>
              Retour
            </Button>
            <Button type="button" loading={submitting} onClick={() => void submitAccount()}>
              {editing ? "Enregistrer" : "Créer le compte"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
