<?php

namespace App\Services;

use App\Http\Resources\StructureResource;
use App\Models\City;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Structure;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Arbre territorial province → ville → district (virtuel) → commune → quartier → structure.
 *
 * Le niveau « district » n'existe pas encore en base : les communes d'une ville
 * sont regroupées sous un nœud synthétique pour conserver la hiérarchie attendue
 * par l'interface.
 */
class TerritoryTreeService
{
    public function build(User $user): array
    {
        $structures = Structure::query()
            ->withCount('members')
            ->when(! $user->isNationalScope(), function (Builder $query) use ($user) {
                match ($user->scopeLevel()) {
                    1 => $query->where('province_id', $user->province_id ?? 0),
                    2 => $query->where('city_id', $user->city_id ?? 0),
                    default => $query->where('id', $user->structure_id ?? 0),
                };
            })
            ->orderBy('name')
            ->get();

        $byZone = $structures->whereNotNull('zone_id')->groupBy('zone_id');
        $byCommune = $structures
            ->whereNotNull('commune_id')
            ->whereNull('zone_id')
            ->groupBy('commune_id');
        $byCity = $structures
            ->whereNotNull('city_id')
            ->whereNull('commune_id')
            ->whereNull('zone_id')
            ->groupBy('city_id');
        $byProvince = $structures
            ->whereNotNull('province_id')
            ->whereNull('city_id')
            ->groupBy('province_id');

        $provinces = Province::query()
            ->where('is_active', true)
            ->when($user->scopeLevel() === 1, fn (Builder $q) => $q->where('id', $user->province_id ?? 0))
            ->when($user->scopeLevel() === 2, fn (Builder $q) => $q->where('id', $user->province_id ?? 0))
            ->when($user->scopeLevel() >= 3, fn (Builder $q) => $q->where('id', $structures->first()?->province_id ?? 0))
            ->orderBy('name')
            ->get(['id', 'code', 'name']);

        $cityQuery = City::query()
            ->where('is_active', true)
            ->when($user->scopeLevel() === 2, fn (Builder $q) => $q->where('id', $user->city_id ?? 0))
            ->when($user->scopeLevel() >= 3, fn (Builder $q) => $q->where('id', $structures->first()?->city_id ?? 0))
            ->orderBy('name');

        $citiesByProvince = $cityQuery->get(['id', 'province_id', 'name'])->groupBy('province_id');

        $communesByCity = Commune::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'city_id', 'province_id', 'name'])
            ->groupBy('city_id');

        $zonesByCommune = Zone::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'commune_id', 'city_id', 'province_id', 'name'])
            ->groupBy('commune_id');

        return $provinces->map(function (Province $province) use (
            $citiesByProvince,
            $communesByCity,
            $zonesByCommune,
            $byProvince,
            $byCity,
            $byCommune,
            $byZone,
        ) {
            $cities = ($citiesByProvince->get($province->id) ?? collect())->map(function (City $city) use (
                $communesByCity,
                $zonesByCommune,
                $byCity,
                $byCommune,
                $byZone,
            ) {
                $communes = ($communesByCity->get($city->id) ?? collect())->map(function (Commune $commune) use (
                    $zonesByCommune,
                    $byCommune,
                    $byZone,
                ) {
                    $quartiers = ($zonesByCommune->get($commune->id) ?? collect())->map(function (Zone $zone) use ($byZone) {
                        return [
                            'id' => $zone->id,
                            'name' => $zone->name,
                            'structures' => $this->mapStructures($byZone->get($zone->id)),
                        ];
                    })->values()->all();

                    return [
                        'id' => $commune->id,
                        'name' => $commune->name,
                        'quartiers' => $quartiers,
                        'structures' => $this->mapStructures($byCommune->get($commune->id)),
                    ];
                })->values()->all();

                return [
                    'id' => $city->id,
                    'name' => $city->name,
                    'districts' => [[
                        'id' => -$city->id,
                        'name' => 'Communes',
                        'communes' => $communes,
                        'structures' => [],
                    ]],
                    'structures' => $this->mapStructures($byCity->get($city->id)),
                ];
            })->values()->all();

            return [
                'id' => $province->id,
                'code' => $province->code,
                'name' => $province->name,
                'cities' => $cities,
                'structures' => $this->mapStructures($byProvince->get($province->id)),
            ];
        })->values()->all();
    }

    /** @param  Collection<int, Structure>|null  $items */
    private function mapStructures(?Collection $items): array
    {
        if ($items === null || $items->isEmpty()) {
            return [];
        }

        return StructureResource::collection($items)->resolve();
    }
}
