"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useApi } from "@/lib/hooks";
import type { Province } from "@/lib/types";

type TerritoryKind = "province" | "city" | "commune";

export function TerritoryFormDialog({
  open,
  kind,
  provinceId,
  cityId,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: TerritoryKind;
  provinceId?: number | null;
  cityId?: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const provinces = useApi<{ data: Province[] }>(open ? "/territories/provinces" : null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedProvince, setSelectedProvince] = useState(String(provinceId ?? ""));
  const [selectedCity, setSelectedCity] = useState(String(cityId ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const titles = {
    province: "Ajouter une province",
    city: "Ajouter une ville / territoire",
    commune: "Ajouter une commune / secteur",
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
      } else {
        response = await api.post("/territories/communes", {
          name,
          city_id: Number(selectedCity || cityId),
          province_id: Number(selectedProvince || provinceId),
          type: "commune",
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

  return (
    <Modal open={open} onClose={onClose} title={titles[kind]} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        {kind === "province" && (
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="KIN" error={errors.code} />
        )}
        {(kind === "city" || kind === "commune") && !provinceId && (
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
