"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { PasswordStrength } from "@/components/ui/password-strength";
import { TerritorySelect } from "@/components/forms/territory-select";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
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

  useEffect(() => {
    if (!open) return;
    if (user) {
      setName(user.name);
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setPassword("");
      setRoleId(String(roles.data?.data.find((r) => r.slug === user.role?.slug)?.id ?? ""));
      setTerritory({
        province_id: user.scope.province_id,
        city_id: user.scope.city_id,
        commune_id: user.scope.commune_id,
        zone_id: null,
      });
      setStructureId(user.scope.structure_id);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRoleId("");
      setTerritory({ province_id: null, city_id: null, commune_id: null, zone_id: null });
      setStructureId(null);
    }
    setErrors({});
  }, [open, user, roles.data?.data]);

  function handleClose() {
    onClose();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
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
    try {
      const response = editing
        ? await api.patch<{ message: string }>(`/users/${user!.id}`, payload)
        : await api.post<{ message: string }>("/users", payload);
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
      description={editing ? user?.email ?? undefined : "Administrateur, responsable territorial ou agent."}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
            levels={{ city: false, commune: false, zone: false }}
          />
        )}
        {level === "city" && (
          <TerritorySelect value={territory} onChange={setTerritory} errors={errors} levels={{ commune: false, zone: false }} />
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
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            {editing ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
