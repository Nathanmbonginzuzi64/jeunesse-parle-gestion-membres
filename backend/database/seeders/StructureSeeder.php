<?php

namespace Database\Seeders;

use App\Models\Commune;
use App\Models\Province;
use App\Models\Structure;
use App\Services\IdentifierGenerator;
use Illuminate\Database\Seeder;

class StructureSeeder extends Seeder
{
    /** [code province, ville, commune, nom structure, type] */
    private const STRUCTURES = [
        ['KIN', 'Kinshasa', null, 'Coordination Nationale Jeunesse Parle', 'coordination_nationale'],
        ['KIN', 'Kinshasa', null, 'Coordination Provinciale Kinshasa', 'coordination_provinciale'],
        ['KIN', 'Kinshasa', 'Gombe', 'Antenne Gombe', 'antenne'],
        ['KIN', 'Kinshasa', 'Kintambo', 'Cellule Kintambo', 'cellule'],
        ['KIN', 'Kinshasa', 'Masina', 'Cellule Masina', 'cellule'],
        ['KIN', 'Kinshasa', 'Limete', 'Club Numérique Limete', 'club'],
        ['HKA', 'Lubumbashi', 'Lubumbashi', 'Coordination Provinciale Haut-Katanga', 'coordination_provinciale'],
        ['HKA', 'Lubumbashi', 'Katuba', 'Cellule Katuba', 'cellule'],
        ['NKV', 'Goma', 'Goma', 'Coordination Provinciale Nord-Kivu', 'coordination_provinciale'],
        ['NKV', 'Goma', 'Karisimbi', 'Cellule Karisimbi', 'cellule'],
        ['SKV', 'Bukavu', 'Ibanda', 'Antenne Bukavu', 'antenne'],
        ['KON', 'Matadi', 'Matadi', 'Antenne Matadi', 'antenne'],
        ['KSC', 'Kananga', 'Kananga', 'Antenne Kananga', 'antenne'],
        ['TSH', 'Kisangani', 'Makiso', 'Antenne Kisangani', 'antenne'],
    ];

    public function run(IdentifierGenerator $identifiers): void
    {
        foreach (self::STRUCTURES as [$provinceCode, $cityName, $communeName, $name, $type]) {
            $province = Province::where('code', $provinceCode)->first();

            if (! $province) {
                continue;
            }

            $city = $province->cities()->where('name', $cityName)->first();
            $commune = $communeName && $city
                ? Commune::where('city_id', $city->id)->where('name', $communeName)->first()
                : null;

            if (Structure::where('name', $name)->exists()) {
                continue;
            }

            Structure::create([
                'code' => $identifiers->structureCode(),
                'name' => $name,
                'type' => $type,
                'province_id' => $province->id,
                'city_id' => $city?->id,
                'commune_id' => $commune?->id,
                'zone_id' => $commune?->zones()->first()?->id,
                'created_on' => now()->subYears(random_int(1, 4))->toDateString(),
                'is_active' => true,
            ]);
        }
    }
}
