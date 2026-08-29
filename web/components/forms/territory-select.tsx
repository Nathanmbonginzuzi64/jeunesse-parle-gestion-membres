"use client";

import { useTerritories } from "@/lib/hooks";
import { Select } from "@/components/ui/field";

export interface TerritoryValue {
  province_id: number | null;
  city_id: number | null;
  commune_id: number | null;
  zone_id: number | null;
}

/**
 * Sélecteur territorial en cascade alimenté par l'API. Sélectionner un niveau
 * supérieur réinitialise les niveaux inférieurs pour éviter les incohérences
 * que le backend rejetterait de toute façon.
 */
export function TerritorySelect({
  value,
  onChange,
  errors = {},
  required = false,
  disabled = false,
  lockedProvince = false,
  columns = 2,
  levels = { city: true, commune: true, zone: true },
}: {
  value: TerritoryValue;
  onChange: (value: TerritoryValue) => void;
  errors?: Record<string, string | undefined>;
  required?: boolean;
  disabled?: boolean;
  /** Verrouille la province lorsque le périmètre de l'utilisateur l'impose. */
  lockedProvince?: boolean;
  columns?: 1 | 2;
  levels?: { city?: boolean; commune?: boolean; zone?: boolean };
}) {
  const { provinces, cities, communes, zones } = useTerritories(
    value.province_id,
    value.city_id,
    value.commune_id,
  );

  return (
    <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
      <Select
        label="Province"
        required={required}
        disabled={disabled || lockedProvince}
        placeholder="Sélectionner une province"
        error={errors.province_id}
        value={value.province_id ?? ""}
        onChange={(event) =>
          onChange({
            province_id: event.target.value ? Number(event.target.value) : null,
            city_id: null,
            commune_id: null,
            zone_id: null,
          })
        }
        options={provinces.map((province) => ({ value: province.id, label: province.name }))}
      />

      {levels.city !== false && (
      <Select
        label="Ville / Territoire"
        disabled={disabled || !value.province_id}
        placeholder={value.province_id ? "Sélectionner" : "Choisir d'abord la province"}
        error={errors.city_id}
        value={value.city_id ?? ""}
        onChange={(event) =>
          onChange({
            ...value,
            city_id: event.target.value ? Number(event.target.value) : null,
            commune_id: null,
            zone_id: null,
          })
        }
        options={cities.map((city) => ({ value: city.id, label: city.name }))}
      />
      )}

      {levels.commune !== false && (
      <Select
        label="Commune / Secteur"
        disabled={disabled || !value.city_id}
        placeholder={value.city_id ? "Sélectionner" : "Choisir d'abord la ville"}
        error={errors.commune_id}
        value={value.commune_id ?? ""}
        onChange={(event) =>
          onChange({
            ...value,
            commune_id: event.target.value ? Number(event.target.value) : null,
            zone_id: null,
          })
        }
        options={communes.map((commune) => ({ value: commune.id, label: commune.name }))}
      />
      )}

      {levels.zone !== false && (
      <Select
        label="Quartier / Zone"
        disabled={disabled || !value.commune_id}
        placeholder={value.commune_id ? "Sélectionner" : "Choisir d'abord la commune"}
        error={errors.zone_id}
        value={value.zone_id ?? ""}
        onChange={(event) =>
          onChange({
            ...value,
            zone_id: event.target.value ? Number(event.target.value) : null,
          })
        }
        options={zones.map((zone) => ({ value: zone.id, label: zone.name }))}
      />
      )}
    </div>
  );
}
