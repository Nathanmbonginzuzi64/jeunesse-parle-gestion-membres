"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, ChevronRight, MapPin, Network, Signpost } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/feedback";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { api, ApiError } from "@/lib/api";
import { fieldErrors } from "@/lib/form";
import { useTerritories } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type TerritoryKind = "province" | "city" | "district" | "commune" | "quartier" | "avenue";

const DIRECTION_OPTIONS = [
  { value: "nord", label: "Nord" },
  { value: "sud", label: "Sud" },
  { value: "est", label: "Est" },
  { value: "ouest", label: "Ouest" },
  { value: "nord-est", label: "Nord-Est" },
  { value: "nord-ouest", label: "Nord-Ouest" },
  { value: "sud-est", label: "Sud-Est" },
  { value: "sud-ouest", label: "Sud-Ouest" },
  { value: "centre", label: "Centre" },
];

const KIND_META: Record<
  TerritoryKind,
  { title: string; description: string; icon: typeof MapPin; path: string[] }
> = {
  province: {
    title: "Ajouter une province",
    description: "Niveau racine du référentiel territorial.",
    icon: MapPin,
    path: ["Province"],
  },
  city: {
    title: "Ajouter une ville / territoire",
    description: "Rattachée à une province existante.",
    icon: Network,
    path: ["Province", "Ville"],
  },
  district: {
    title: "Ajouter un district",
    description: "Nommez un regroupement de communes sous une ville. Il apparaîtra dans l'arbre territorial.",
    icon: Network,
    path: ["Province", "Ville", "District"],
  },
  commune: {
    title: "Ajouter une commune / secteur",
    description: "Rattachée à une ville (et éventuellement un district).",
    icon: Building2,
    path: ["Province", "Ville", "Commune"],
  },
  quartier: {
    title: "Ajouter un quartier",
    description: "Niveau local rattaché à une commune.",
    icon: MapPin,
    path: ["Province", "Ville", "Commune", "Quartier"],
  },
  avenue: {
    title: "Ajouter une avenue",
    description: "Voie rattachée à un quartier, avec repères de localisation.",
    icon: Signpost,
    path: ["Province", "Ville", "Commune", "Quartier", "Avenue"],
  },
};

export function TerritoryFormDialog({
  open,
  kind,
  provinceId,
  cityId,
  districtId,
  communeId,
  zoneId,
  onClose,
  onSaved,
}: {
  open: boolean;
  kind: TerritoryKind;
  provinceId?: number | null;
  cityId?: number | null;
  districtId?: number | null;
  communeId?: number | null;
  zoneId?: number | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;

  const [territory, setTerritory] = useState({
    province_id: null as number | null,
    city_id: null as number | null,
    district_id: null as number | null,
    commune_id: null as number | null,
    zone_id: null as number | null,
  });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("");
  const [number, setNumber] = useState("");
  const [direction, setDirection] = useState("");
  const [referenceStop, setReferenceStop] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { provinces, cities, districts, communes, quartiers } = useTerritories(
    territory.province_id,
    territory.city_id,
    territory.district_id,
    territory.commune_id,
    territory.zone_id,
  );

  useEffect(() => {
    if (!open) return;
    setTerritory({
      province_id: provinceId ?? null,
      city_id: cityId ?? null,
      district_id: districtId ?? null,
      commune_id: communeId ?? null,
      zone_id: zoneId ?? null,
    });
    setName("");
    setCode("");
    setType("");
    setNumber("");
    setDirection("");
    setReferenceStop("");
    setErrors({});
  }, [open, kind, provinceId, cityId, districtId, communeId, zoneId]);

  const defaultTypes = useMemo(
    () => ({
      city: "ville",
      commune: "commune",
      quartier: "quartier",
    }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setType(defaultTypes[kind as keyof typeof defaultTypes] ?? "");
  }, [open, kind, defaultTypes]);

  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: p.id, label: p.name, hint: p.code ? `Code ${p.code}` : undefined })),
    [provinces],
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.id, label: c.name, hint: c.type ?? undefined })),
    [cities],
  );
  const districtOptions = useMemo(
    () => districts.map((d) => ({ value: d.id, label: d.name, hint: d.type ?? undefined })),
    [districts],
  );
  const communeOptions = useMemo(
    () => communes.map((c) => ({ value: c.id, label: c.name, hint: c.type ?? undefined })),
    [communes],
  );
  const quartierOptions = useMemo(
    () => quartiers.map((q) => ({ value: q.id, label: q.name, hint: q.type ?? undefined })),
    [quartiers],
  );

  const needsProvince = kind !== "province";
  const needsCity = ["district", "commune", "quartier", "avenue"].includes(kind);
  const needsDistrict = kind === "commune";
  const needsCommune = ["quartier", "avenue"].includes(kind);
  const needsQuartier = kind === "avenue";

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
          province_id: territory.province_id,
          type: type || "ville",
        });
      } else if (kind === "district") {
        response = await api.post("/territories/districts", {
          name,
          city_id: territory.city_id,
          province_id: territory.province_id,
          type: "district",
        });
      } else if (kind === "commune") {
        response = await api.post("/territories/communes", {
          name,
          city_id: territory.city_id,
          province_id: territory.province_id,
          district_id: territory.district_id ?? undefined,
          type: type || "commune",
        });
      } else if (kind === "quartier") {
        response = await api.post("/territories/quartiers", {
          name,
          commune_id: territory.commune_id,
          type: type || "quartier",
        });
      } else {
        response = await api.post("/territories/avenues", {
          name,
          zone_id: territory.zone_id,
          number: number || undefined,
          direction: direction || undefined,
          reference_stop: referenceStop || undefined,
        });
      }

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
      title={meta.title}
      description={meta.description}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Icon className="h-4 w-4" />
            </span>
            Hiérarchie territoriale
          </div>
          <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
            {meta.path.map((step, index) => (
              <li key={step} className="flex items-center gap-1">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium",
                    index === meta.path.length - 1
                      ? "bg-brand-600 text-white"
                      : "bg-white text-slate-600 ring-1 ring-slate-200",
                  )}
                >
                  {step}
                </span>
                {index < meta.path.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </li>
            ))}
          </ol>
        </div>

        {kind === "district" && (
          <Alert tone="info" title="Regroupement des communes">
            Le district sert à organiser les communes dans l&apos;arbre territorial. Après sa création,
            rattachez-y des communes via le formulaire <strong>Commune</strong>.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {needsProvince && (
            <SearchableSelect
              label="Province"
              required
              disabled={Boolean(provinceId)}
              placeholder="Choisir une province"
              value={territory.province_id}
              onChange={(value) =>
                setTerritory({
                  province_id: value ? Number(value) : null,
                  city_id: null,
                  district_id: null,
                  commune_id: null,
                  zone_id: null,
                })
              }
              options={provinceOptions}
              error={errors.province_id}
              emptyMessage="Aucune province disponible"
            />
          )}

          {needsCity && (
            <SearchableSelect
              label="Ville / Territoire"
              required
              disabled={Boolean(cityId) || !territory.province_id}
              placeholder={territory.province_id ? "Choisir une ville" : "Sélectionnez d'abord la province"}
              value={territory.city_id}
              onChange={(value) =>
                setTerritory((current) => ({
                  ...current,
                  city_id: value ? Number(value) : null,
                  district_id: null,
                  commune_id: null,
                  zone_id: null,
                }))
              }
              options={cityOptions}
              error={errors.city_id}
              emptyMessage={territory.province_id ? "Aucune ville pour cette province" : "Province requise"}
            />
          )}

          {needsDistrict && (
            <SearchableSelect
              label="District"
              hint="Optionnel — rattache la commune à un district nommé"
              disabled={!territory.city_id}
              placeholder={territory.city_id ? "Choisir un district (optionnel)" : "Sélectionnez d'abord la ville"}
              value={territory.district_id}
              onChange={(value) =>
                setTerritory((current) => ({
                  ...current,
                  district_id: value ? Number(value) : null,
                  commune_id: null,
                  zone_id: null,
                }))
              }
              options={districtOptions}
              error={errors.district_id}
              emptyMessage="Aucun district pour cette ville"
            />
          )}

          {needsCommune && (
            <SearchableSelect
              label="Commune / Secteur"
              required
              disabled={Boolean(communeId) || !territory.city_id}
              placeholder={territory.city_id ? "Choisir une commune" : "Sélectionnez d'abord la ville"}
              value={territory.commune_id}
              onChange={(value) =>
                setTerritory((current) => ({
                  ...current,
                  commune_id: value ? Number(value) : null,
                  zone_id: null,
                }))
              }
              options={communeOptions}
              error={errors.commune_id}
              emptyMessage={territory.city_id ? "Aucune commune pour cette ville" : "Ville requise"}
            />
          )}

          {needsQuartier && (
            <SearchableSelect
              label="Quartier"
              required
              disabled={Boolean(zoneId) || !territory.commune_id}
              placeholder={territory.commune_id ? "Choisir un quartier" : "Sélectionnez d'abord la commune"}
              value={territory.zone_id}
              onChange={(value) =>
                setTerritory((current) => ({
                  ...current,
                  zone_id: value ? Number(value) : null,
                }))
              }
              options={quartierOptions}
              error={errors.zone_id}
              emptyMessage={territory.commune_id ? "Aucun quartier pour cette commune" : "Commune requise"}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {kind === "province" && (
            <Input
              label="Code"
              hint="Ex. KIN — généré automatiquement si vide"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="KIN"
              error={errors.code}
            />
          )}

          {kind === "city" && (
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: "ville", label: "Ville" },
                { value: "territoire", label: "Territoire" },
              ]}
            />
          )}

          {kind === "commune" && (
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: "commune", label: "Commune" },
                { value: "secteur", label: "Secteur" },
                { value: "chefferie", label: "Chefferie" },
              ]}
            />
          )}

          {kind === "quartier" && (
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: "quartier", label: "Quartier" },
                { value: "groupement", label: "Groupement" },
              ]}
            />
          )}

          {kind !== "avenue" && (
            <Input
              label={kind === "district" ? "Nom du district" : "Nom"}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === "district"
                  ? "Ex. District de la Gombe"
                  : `Nom du ${meta.path[meta.path.length - 1].toLowerCase()}`
              }
              error={errors.name}
              wrapperClassName={kind === "province" ? undefined : "sm:col-span-2"}
            />
          )}

          {kind === "avenue" && (
            <>
              <Input
                label="Nom de l'avenue"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Avenue Tombalbaye"
                error={errors.name}
                wrapperClassName="sm:col-span-2"
              />
              <Input
                label="Numéro"
                hint="Numéro ou plage (ex. 12, 12-18)"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="12"
                error={errors.number}
              />
              <Select
                label="Direction"
                hint="Orientation de la voie"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="Sélectionner"
                options={DIRECTION_OPTIONS}
                error={errors.direction}
              />
              <Input
                label="Arrêt de référence"
                hint="Point de repère ou arrêt de transport proche"
                value={referenceStop}
                onChange={(e) => setReferenceStop(e.target.value)}
                placeholder="Ex. Arrêt Socimat"
                error={errors.reference_stop}
                wrapperClassName="sm:col-span-2"
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            loading={submitting}
            disabled={
              (needsProvince && !territory.province_id) ||
              (needsCity && !territory.city_id) ||
              (needsCommune && !territory.commune_id) ||
              (needsQuartier && !territory.zone_id) ||
              !name.trim()
            }
          >
            Ajouter
          </Button>
        </div>
      </form>
    </Modal>
  );
}
