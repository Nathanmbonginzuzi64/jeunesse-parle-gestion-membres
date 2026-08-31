"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CalendarDays, MapPin, Navigation, Users } from "lucide-react";
import { ActivityImageField } from "@/components/activities/activity-image-field";
import { TerritorySelect } from "@/components/forms/territory-select";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { api, ApiError } from "@/lib/api";
import { fieldErrors, toFormData } from "@/lib/form";
import { usePublicStructures, useReferences, useTerritories } from "@/lib/hooks";
import type { Activity } from "@/lib/types";

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function ActivityForm({
  initial,
  onSaved,
  onCancel,
  submitLabel = "Créer l'activité",
}: {
  initial?: Activity | null;
  onSaved: (activity: Activity, message: string) => void;
  onCancel?: () => void;
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
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });
  const [avenueId, setAvenueId] = useState<number | null>(null);
  const [structureId, setStructureId] = useState<number | null>(null);
  const structures = usePublicStructures(territory.province_id, territory.city_id);
  const { avenues } = useTerritories(
    territory.province_id,
    territory.city_id,
    territory.district_id,
    territory.commune_id,
    territory.zone_id,
  );

  useEffect(() => {
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setType(initial.type);
      setStartsAt(initial.starts_at?.slice(0, 16) ?? "");
      setEndsAt(initial.ends_at?.slice(0, 16) ?? "");
      setLocation(initial.location ?? "");
      setLatitude(initial.latitude != null ? String(initial.latitude) : "");
      setLongitude(initial.longitude != null ? String(initial.longitude) : "");
      setCapacity(initial.capacity ? String(initial.capacity) : "");
      setIsPublic(initial.is_public);
      setImage(null);
      setTerritory({
        province_id: initial.province?.id ?? null,
        city_id: initial.city?.id ?? null,
        district_id: null,
        commune_id: initial.commune?.id ?? null,
        zone_id: initial.zone?.id ?? initial.quartier?.id ?? null,
      });
      setAvenueId(initial.avenue?.id ?? null);
      setStructureId(initial.structure?.id ?? null);
      return;
    }

    setTitle("");
    setDescription("");
    setType("");
    setStartsAt("");
    setEndsAt("");
    setLocation("");
    setLatitude("");
    setLongitude("");
    setCapacity("");
    setIsPublic(false);
    setImage(null);
    setTerritory({ province_id: null, city_id: null, district_id: null, commune_id: null, zone_id: null });
    setAvenueId(null);
    setStructureId(null);
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
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      capacity: capacity ? Number(capacity) : null,
      is_public: isPublic,
      province_id: territory.province_id,
      city_id: territory.city_id,
      commune_id: territory.commune_id,
      zone_id: territory.zone_id,
      avenue_id: avenueId,
      structure_id: structureId,
      image,
    };

    try {
      const body = toFormData(payload);
      if (editing) body.append("_method", "PATCH");

      const response = editing
        ? await api.post<{ data: Activity; message: string }>(`/activities/${initial!.id}`, body)
        : await api.post<{ data: Activity; message: string }>("/activities", body);

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
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      <ActivityImageField previewUrl={initial?.image_url} onChange={setImage} error={errors.image} />

      <FormSection icon={CalendarDays} title="Informations générales" description="Titre, type et description de l'événement.">
        <Input label="Titre" required value={title} onChange={(event) => setTitle(event.target.value)} error={errors.title} placeholder="Ex. Formation leadership jeunesse" />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objectifs, programme, public cible…" rows={4} />
        <Select label="Type d'activité" required placeholder="Sélectionner" value={type} onChange={(event) => setType(event.target.value)} options={references?.activity_types ?? []} error={errors.type} />
      </FormSection>

      <FormSection icon={MapPin} title="Planification & lieu" description="Dates, adresse et coordonnées GPS.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Début" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} error={errors.starts_at} />
          <Input label="Fin" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} error={errors.ends_at} />
          <Input label="Adresse / lieu" value={location} onChange={(event) => setLocation(event.target.value)} error={errors.location} placeholder="Adresse complète ou repère" wrapperClassName="sm:col-span-2" />
          <Input label="Latitude GPS" type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="-4.3217" error={errors.latitude} />
          <Input label="Longitude GPS" type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="15.3125" error={errors.longitude} />
          <Input label="Capacité" type="number" min={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="Nombre de places" />
        </div>
      </FormSection>

      <FormSection icon={Navigation} title="Localisation administrative" description="Province → Avenue et structure organisatrice.">
        <TerritorySelect
          value={territory}
          onChange={(value) => {
            setTerritory(value);
            setAvenueId(null);
            setStructureId(null);
          }}
          levels={{ district: true, commune: true, zone: true }}
        />
        <Select
          label="Avenue"
          placeholder={territory.zone_id ? "Sélectionner" : "Choisir d'abord le quartier"}
          disabled={!territory.zone_id}
          value={avenueId ?? ""}
          onChange={(event) => setAvenueId(event.target.value ? Number(event.target.value) : null)}
          options={avenues.map((avenue) => ({ value: avenue.id, label: avenue.name }))}
          error={errors.avenue_id}
        />
        <Select
          label="Structure organisatrice"
          placeholder="Facultatif"
          value={structureId ?? ""}
          onChange={(event) => setStructureId(event.target.value ? Number(event.target.value) : null)}
          options={structures.map((structure) => ({ value: structure.id, label: structure.name }))}
          error={errors.structure_id}
        />
        <Checkbox checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} label="Activité visible des membres concernés" />
      </FormSection>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
