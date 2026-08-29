"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { TerritorySelect } from "@/components/forms/territory-select";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useReferences } from "@/lib/hooks";
import type { Structure } from "@/lib/types";

export function StructureFormDialog({
  open,
  onClose,
  structure,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  structure?: Structure | null;
  onSaved: (message: string) => void;
}) {
  const references = useReferences();
  const editing = Boolean(structure);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });

  useEffect(() => {
    if (!open) return;
    if (structure) {
      setName(structure.name);
      setType(structure.type);
      setDescription(structure.description ?? "");
      setAddress(structure.address ?? "");
      setTerritory({
        province_id: structure.province?.id ?? null,
        city_id: structure.city?.id ?? null,
        commune_id: structure.commune?.id ?? null,
        zone_id: structure.zone?.id ?? null,
      });
    } else {
      setName("");
      setType("");
      setDescription("");
      setAddress("");
      setTerritory({ province_id: null, city_id: null, commune_id: null, zone_id: null });
    }
    setErrors({});
  }, [open, structure]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    const payload = {
      name,
      type,
      description: description || null,
      address: address || null,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      zone_id: territory.zone_id,
    };
    try {
      const response = editing
        ? await api.patch<{ message: string }>(`/structures/${structure!.id}`, payload)
        : await api.post<{ message: string }>("/structures", payload);
      onSaved(response.message);
      onClose();
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(fieldErrors(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Modifier la structure" : "Nouvelle structure"}
      description={editing ? structure?.code : "Cellule, antenne ou coordination territoriale."}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Nom" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Select
          label="Type"
          required
          placeholder="Sélectionner"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={references?.structure_types ?? []}
          error={errors.type}
        />
        <TerritorySelect required value={territory} onChange={setTerritory} errors={errors} />
        <Input label="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
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
