"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import type { City, Province } from "@/lib/types";

type TerritoryKind = "province" | "city" | "district" | "commune" | "quartier";

export function TerritoryFormDialog({
  open,
  kind,
  provinceId,
  cityId,
  districtId,
  communeId,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: TerritoryKind;
  provinceId?: number | null;
  cityId?: number | null;
  districtId?: number | null;
  communeId?: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const provinces = useApi<{ data: Province[] }>(open ? "/territories/provinces" : null);
  const cities = useApi<{ data: City[] }>(
    open && (kind === "district" || kind === "commune" || kind === "quartier")
      ? "/territories/cities"
      : null,
    provinceId ? { province_id: provinceId } : undefined,
  );
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedProvince, setSelectedProvince] = useState(String(provinceId ?? ""));
  const [selectedCity, setSelectedCity] = useState(String(cityId ?? ""));
  const [selectedDistrict, setSelectedDistrict] = useState(String(districtId ?? ""));
  const [selectedCommune, setSelectedCommune] = useState(String(communeId ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const titles: Record<TerritoryKind, string> = {
    province: "Ajouter une province",
    city: "Ajouter une ville / territoire",
    district: "Ajouter un district",
    commune: "Ajouter une commune / secteur",
    quartier: "Ajouter un quartier",
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      let response: { message: string };
      if (kind === "province") {
        response = await api.post("/territories/provinces", { name, code: code || undefined });
      } else if (kind === "city") {
        response = await api.post("/territories/cities", {
          name,
          province_id: Number(selectedProvince || provinceId),
          type: "ville",
        });
      } else if (kind === "district") {
        response = await api.post("/territories/districts", {
          name,
          city_id: Number(selectedCity || cityId),
          province_id: Number(selectedProvince || provinceId),
          type: "district",
        });
      } else if (kind === "commune") {
        response = await api.post("/territories/communes", {
          name,
          city_id: Number(selectedCity || cityId),
          province_id: Number(selectedProvince || provinceId),
          district_id: Number(selectedDistrict || districtId) || undefined,
          type: "commune",
        });
      } else {
        response = await api.post("/territories/quartiers", {
          name,
          commune_id: Number(selectedCommune || communeId),
          type: "quartier",
        });
      }
      onSaved(response.message);
      setName("");
      setCode("");
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(fieldErrors(caught));
    } finally {
      setSubmitting(false);
    }
  }

  const needsProvince = kind === "city" || kind === "district" || kind === "commune";
  const needsCity = kind === "district" || kind === "commune";
  const needsDistrict = kind === "commune";
  const needsCommune = kind === "quartier";

  return (
    <Modal open={open} onClose={onClose} title={titles[kind]} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        {kind === "province" && (
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="KIN" error={errors.code} />
        )}
        {needsProvince && !provinceId && (
          <Select
            label="Province"
            required
            placeholder="Sélectionner"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            options={(provinces.data?.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
            error={errors.province_id}
          />
        )}
        {needsCity && !cityId && (
          <Select
            label="Ville / Territoire"
            required
            placeholder="Sélectionner"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            options={(cities.data?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
            error={errors.city_id}
          />
        )}
        {needsDistrict && !districtId && (
          <Input
            label="ID district (optionnel)"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            placeholder="Lier à un district existant"
            error={errors.district_id}
          />
        )}
        {needsCommune && !communeId && (
          <Input
            label="ID commune"
            required
            value={selectedCommune}
            onChange={(e) => setSelectedCommune(e.target.value)}
            placeholder="Identifiant de la commune parente"
            error={errors.commune_id}
          />
        )}
        <Input label="Nom" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            Ajouter
          </Button>
        </div>
      </form>
    </Modal>
  );
}
