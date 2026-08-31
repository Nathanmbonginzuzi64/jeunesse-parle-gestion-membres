<?php

namespace App\Services;

use App\Http\Resources\StructureResource;
use App\Models\Avenue;
use App\Models\City;
use App\Models\Commune;
use App\Models\District;
use App\Models\Province;
use App\Models\Structure;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Arbre territorial province → ville → district → commune → quartier → avenue → structure.
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

        $byAvenue = $structures->whereNotNull('avenue_id')->groupBy('avenue_id');
        $byZone = $structures
            ->whereNotNull('zone_id')
            ->whereNull('avenue_id')
            ->groupBy('zone_id');
        $byCommune = $structures
            ->whereNotNull('commune_id')
            ->whereNull('zone_id')
            ->whereNull('avenue_id')
            ->groupBy('commune_id');
        $byCity = $structures
            ->whereNotNull('city_id')
            ->whereNull('commune_id')
            ->whereNull('zone_id')
            ->whereNull('avenue_id')
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

        $districtsByCity = District::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'city_id', 'province_id', 'name'])
            ->groupBy('city_id');

        $communesByCity = Commune::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'city_id', 'province_id', 'district_id', 'name'])
            ->groupBy('city_id');

        $zonesByCommune = Zone::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'commune_id', 'city_id', 'province_id', 'name'])
            ->groupBy('commune_id');

        $avenuesByZone = Avenue::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'zone_id', 'name', 'number', 'direction', 'reference_stop'])
            ->groupBy('zone_id');

        return $provinces->map(function (Province $province) use (
            $citiesByProvince,
            $districtsByCity,
            $communesByCity,
            $zonesByCommune,
            $avenuesByZone,
            $byProvince,
            $byCity,
            $byCommune,
            $byZone,
            $byAvenue,
        ) {
            $cities = ($citiesByProvince->get($province->id) ?? collect())->map(function (City $city) use (
                $districtsByCity,
                $communesByCity,
                $zonesByCommune,
                $avenuesByZone,
                $byCity,
                $byCommune,
                $byZone,
                $byAvenue,
            ) {
                $cityCommunes = $communesByCity->get($city->id) ?? collect();
                $cityDistricts = $districtsByCity->get($city->id) ?? collect();

                $districtNodes = $cityDistricts->map(function (District $district) use (
                    $cityCommunes,
                    $zonesByCommune,
                    $avenuesByZone,
                    $byCommune,
                    $byZone,
                    $byAvenue,
                ) {
                    $communes = $cityCommunes
                        ->where('district_id', $district->id)
                        ->map(fn (Commune $commune) => $this->mapCommune($commune, $zonesByCommune, $avenuesByZone, $byCommune, $byZone, $byAvenue))
                        ->values()
                        ->all();

                    return [
                        'id' => $district->id,
                        'name' => $district->name,
                        'communes' => $communes,
                        'structures' => [],
                    ];
                })->values();

                $orphanCommunes = $cityCommunes
                    ->whereNull('district_id')
                    ->map(fn (Commune $commune) => $this->mapCommune($commune, $zonesByCommune, $avenuesByZone, $byCommune, $byZone, $byAvenue))
                    ->values()
                    ->all();

                if ($orphanCommunes !== []) {
                    $districtNodes->push([
                        'id' => -$city->id,
                        'name' => 'Communes',
                        'communes' => $orphanCommunes,
                        'structures' => [],
                    ]);
                }

                if ($districtNodes->isEmpty()) {
                    $districtNodes = collect([[
                        'id' => -$city->id,
                        'name' => 'Communes',
                        'communes' => $cityCommunes
                            ->map(fn (Commune $commune) => $this->mapCommune($commune, $zonesByCommune, $avenuesByZone, $byCommune, $byZone, $byAvenue))
                            ->values()
                            ->all(),
                        'structures' => [],
                    ]]);
                }

                return [
                    'id' => $city->id,
                    'name' => $city->name,
                    'districts' => $districtNodes->values()->all(),
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

    /** @param  Collection<int, Zone>  $zonesByCommune */
    /** @param  Collection<int, Avenue>  $avenuesByZone */
    private function mapCommune(
        Commune $commune,
        Collection $zonesByCommune,
        Collection $avenuesByZone,
        Collection $byCommune,
        Collection $byZone,
        Collection $byAvenue,
    ): array {
        $quartiers = ($zonesByCommune->get($commune->id) ?? collect())
            ->map(fn (Zone $zone) => $this->mapQuartier($zone, $avenuesByZone, $byZone, $byAvenue))
            ->values()
            ->all();

        return [
            'id' => $commune->id,
            'name' => $commune->name,
            'quartiers' => $quartiers,
            'structures' => $this->mapStructures($byCommune->get($commune->id)),
        ];
    }

    /** @param  Collection<int, Avenue>  $avenuesByZone */
    private function mapQuartier(
        Zone $zone,
        Collection $avenuesByZone,
        Collection $byZone,
        Collection $byAvenue,
    ): array {
        $avenues = ($avenuesByZone->get($zone->id) ?? collect())->map(function (Avenue $avenue) use ($byAvenue) {
            return [
                'id' => $avenue->id,
                'name' => $avenue->name,
                'number' => $avenue->number,
                'direction' => $avenue->direction,
                'reference_stop' => $avenue->reference_stop,
                'structures' => $this->mapStructures($byAvenue->get($avenue->id)),
            ];
        })->values()->all();

        return [
            'id' => $zone->id,
            'name' => $zone->name,
            'avenues' => $avenues,
            'structures' => $this->mapStructures($byZone->get($zone->id)),
        ];
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
