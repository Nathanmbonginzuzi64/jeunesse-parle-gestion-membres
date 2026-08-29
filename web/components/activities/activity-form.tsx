"use client";

import { useEffect, useState, type FormEvent } from "react";
import { TerritorySelect } from "@/components/forms/territory-select";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { usePublicStructures, useReferences } from "@/lib/hooks";
import type { Activity } from "@/lib/types";

export function ActivityForm({
  initial,
  onSaved,
  submitLabel = "Créer l'activité",
}: {
  initial?: Activity | null;
  onSaved: (activity: Activity, message: string) => void;
  submitLabel?: string;
}) {
  const references = useReferences();
  const editing = Boolean(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });
  const [structureId, setStructureId] = useState<number | null>(null);
  const structures = usePublicStructures(territory.province_id, territory.city_id);

  useEffect(() => {
    if (!initial) return;
    setTitle(initial.title);
    setDescription(initial.description ?? "");
    setType(initial.type);
    setStartsAt(initial.starts_at?.slice(0, 16) ?? "");
    setEndsAt(initial.ends_at?.slice(0, 16) ?? "");
    setLocation(initial.location ?? "");
    setCapacity(initial.capacity ? String(initial.capacity) : "");
    setIsPublic(initial.is_public);
    setTerritory({
      province_id: initial.province?.id ?? null,
      city_id: null,
      district_id: null,
      commune_id: null,
      zone_id: null,
    });
    setStructureId(initial.structure?.id ?? null);
  }, [initial]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setErrors({});
    const payload = {
      title,
      description: description || null,
      type,
      starts_at: startsAt,
      ends_at: endsAt || null,
      location: location || null,
      capacity: capacity ? Number(capacity) : null,
      is_public: isPublic,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      structure_id: structureId,
    };
    try {
      const response = editing
        ? await api.patch<{ data: Activity; message: string }>(`/activities/${initial!.id}`, payload)
        : await api.post<{ data: Activity; message: string }>("/activities", payload);
      onSaved(response.data, response.message);
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
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <Input label="Titre" required value={title} onChange={(event) => setTitle(event.target.value)} error={errors.title} />
      <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Type"
          required
          placeholder="Sélectionner"
          value={type}
          onChange={(event) => setType(event.target.value)}
          options={references?.activity_types ?? []}
          error={errors.type}
        />
        <Input label="Lieu" value={location} onChange={(event) => setLocation(event.target.value)} error={errors.location} />
        <Input label="Début" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} error={errors.starts_at} />
        <Input label="Fin" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} error={errors.ends_at} />
        <Input label="Capacité" type="number" value={capacity} onChange={(event) => setCapacity(event.target.value)} />
      </div>
      <TerritorySelect value={territory} onChange={(value) => { setTerritory(value); setStructureId(null); }} />
      <Select
        label="Structure"
        placeholder="Facultatif"
        value={structureId ?? ""}
        onChange={(event) => setStructureId(event.target.value ? Number(event.target.value) : null)}
        options={structures.map((structure) => ({ value: structure.id, label: structure.name }))}
      />
      <Checkbox
        checked={isPublic}
        onChange={(event) => setIsPublic(event.target.checked)}
        label="Activité visible des membres concernés"
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
