"use client";

import { RotateCcw } from "lucide-react";
import { TerritorySelect } from "@/components/forms/territory-select";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { usePublicStructures } from "@/lib/hooks";
import type { ReportFiltersState } from "@/lib/reports/api-types";
import { PERIOD_LABELS, STATUS_LABELS } from "@/lib/reports/types";

interface ReportFiltersBarProps {
  filters: ReportFiltersState;
  onChange: (filters: ReportFiltersState) => void;
  onReset: () => void;
  showTerritory?: boolean;
  showPeriod?: boolean;
  showStatus?: boolean;
  showRegistrationDates?: boolean;
  showActivityDates?: boolean;
  showSearch?: boolean;
  showStructure?: boolean;
}

export function ReportFiltersBar({
  filters,
  onChange,
  onReset,
  showTerritory = true,
  showPeriod = true,
  showStatus = true,
  showRegistrationDates = false,
  showActivityDates = false,
  showSearch = true,
  showStructure = false,
}: ReportFiltersBarProps) {
  const structures = usePublicStructures(filters.province_id, filters.city_id);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {showSearch ? (
            <div className="min-w-[200px] flex-1">
              <Input
                label="Recherche"
                placeholder="Nom, ID membre, activité…"
                value={filters.q}
                onChange={(e) => onChange({ ...filters, q: e.target.value })}
              />
            </div>
          ) : null}

          {showPeriod ? (
            <div className="w-44">
              <Select
                label="Période"
                value={filters.period}
                onChange={(e) => onChange({ ...filters, period: e.target.value })}
              >
                <option value="">Toutes</option>
                {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {showStatus ? (
            <div className="w-44">
              <Select
                label="Statut membre"
                value={filters.status}
                onChange={(e) => onChange({ ...filters, status: e.target.value })}
              >
                <option value="">Tous</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {showStructure ? (
            <div className="w-52">
              <Select
                label="Structure"
                value={filters.structure_id}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    structure_id: e.target.value ? Number(e.target.value) : "",
                  })
                }
              >
                <option value="">Toutes</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <Button type="button" variant="ghost" onClick={onReset} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
            Réinitialiser
          </Button>
        </div>

        {showTerritory ? (
          <TerritorySelect
            value={{
              province_id: filters.province_id,
              city_id: filters.city_id,
              district_id: filters.district_id,
              commune_id: filters.commune_id,
              zone_id: filters.zone_id,
            }}
            onChange={(territory) =>
              onChange({
                ...filters,
                province_id: territory.province_id,
                city_id: territory.city_id,
                district_id: territory.district_id,
                commune_id: territory.commune_id,
                zone_id: territory.zone_id,
              })
            }
          />
        ) : null}

        {(showRegistrationDates || showActivityDates) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {showRegistrationDates ? (
              <>
                <Input
                  type="date"
                  label="Inscription du"
                  value={filters.registered_from}
                  onChange={(e) => onChange({ ...filters, registered_from: e.target.value })}
                />
                <Input
                  type="date"
                  label="Inscription au"
                  value={filters.registered_to}
                  onChange={(e) => onChange({ ...filters, registered_to: e.target.value })}
                />
              </>
            ) : null}
            {showActivityDates ? (
              <>
                <Input
                  type="date"
                  label="Activité du"
                  value={filters.from}
                  onChange={(e) => onChange({ ...filters, from: e.target.value })}
                />
                <Input
                  type="date"
                  label="Activité au"
                  value={filters.to}
                  onChange={(e) => onChange({ ...filters, to: e.target.value })}
                />
              </>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function filtersToQuery(filters: ReportFiltersState, page?: number) {
  return {
    page,
    q: filters.q || undefined,
    period: filters.period || undefined,
    status: filters.status || undefined,
    province_id: filters.province_id ?? undefined,
    city_id: filters.city_id ?? undefined,
    commune_id: filters.commune_id ?? undefined,
    zone_id: filters.zone_id ?? undefined,
    structure_id: filters.structure_id || undefined,
    registered_from: filters.registered_from || undefined,
    registered_to: filters.registered_to || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  };
}
