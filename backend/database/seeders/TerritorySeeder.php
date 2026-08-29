<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Database\Seeder;

/**
 * Découpage administratif de la République Démocratique du Congo.
 *
 * Les 26 provinces sont exhaustives ; les villes, communes et quartiers fournis
 * constituent une base de démarrage destinée à être complétée en production
 * depuis l'interface d'administration.
 */
class TerritorySeeder extends Seeder
{
    /** [code, nom, chef-lieu, latitude, longitude] */
    private const PROVINCES = [
        ['KIN', 'Kinshasa', 'Kinshasa', -4.4419, 15.2663],
        ['KON', 'Kongo-Central', 'Matadi', -5.8362, 13.4530],
        ['KWA', 'Kwango', 'Kenge', -4.8500, 17.0333],
        ['KWL', 'Kwilu', 'Bandundu', -3.3167, 17.3667],
        ['MAI', 'Mai-Ndombe', 'Inongo', -1.9500, 18.2667],
        ['KSA', 'Kasaï', 'Tshikapa', -6.4167, 20.8000],
        ['KSC', 'Kasaï-Central', 'Kananga', -5.8960, 22.4166],
        ['KSO', 'Kasaï-Oriental', 'Mbuji-Mayi', -6.1360, 23.5898],
        ['LOM', 'Lomami', 'Kabinda', -6.1319, 24.4850],
        ['SNK', 'Sankuru', 'Lusambo', -4.9730, 23.4370],
        ['MNM', 'Maniema', 'Kindu', -2.9440, 25.9200],
        ['SKV', 'Sud-Kivu', 'Bukavu', -2.5083, 28.8608],
        ['NKV', 'Nord-Kivu', 'Goma', -1.6792, 29.2228],
        ['ITU', 'Ituri', 'Bunia', 1.5667, 30.2500],
        ['HUE', 'Haut-Uélé', 'Isiro', 2.7700, 27.6167],
        ['TSH', 'Tshopo', 'Kisangani', 0.5153, 25.1911],
        ['BUE', 'Bas-Uélé', 'Buta', 2.7833, 24.7333],
        ['NUB', 'Nord-Ubangi', 'Gbadolite', 4.2833, 21.0167],
        ['MON', 'Mongala', 'Lisala', 2.1500, 21.5167],
        ['SUB', 'Sud-Ubangi', 'Gemena', 3.2500, 19.7667],
        ['EQU', 'Équateur', 'Mbandaka', 0.0487, 18.2603],
        ['TUA', 'Tshuapa', 'Boende', -0.2167, 20.8667],
        ['TAN', 'Tanganyika', 'Kalemie', -5.9167, 29.2000],
        ['HLO', 'Haut-Lomami', 'Kamina', -8.7386, 24.9906],
        ['LUA', 'Lualaba', 'Kolwezi', -10.7167, 25.4667],
        ['HKA', 'Haut-Katanga', 'Lubumbashi', -11.6876, 27.5026],
    ];

    /** province => [ [nom ville, type, [communes...]] ] */
    private const CITIES = [
        'KIN' => [
            ['Kinshasa', 'ville', [
                'Gombe' => ['Centre-ville', 'Résidentiel', 'Golf'],
                'Kintambo' => ['Kilimani', 'Jamaïque', 'Camp Luka'],
                'Lingwala' => ['Boyata', 'Singa Mopepe'],
                'Ngaliema' => ['Binza Delvaux', 'Ma Campagne', 'Kinsuka'],
                'Limete' => ['Résidentiel', 'Industriel', 'Mombele'],
                'Masina' => ['Sans-Fil', 'Abattoir', 'Kimbangu'],
                'Ndjili' => ['Quartier 1', 'Quartier 7'],
                'Matete' => ['Tomba', 'Vijana'],
                'Kalamu' => ['Yolo Nord', 'Yolo Sud', 'Kauka'],
                'Bandalungwa' => ['Adoula', 'Lubudi'],
            ]],
        ],
        'KON' => [
            ['Matadi', 'ville', ['Matadi' => ['Ville Haute', 'Ville Basse'], 'Nzanza' => ['Soyo'], 'Mvuzi' => ['Ceinture']]],
            ['Boma', 'ville', ['Kabondo' => ['Centre'], 'Nzadi' => ['Port']]],
            ['Muanda', 'territoire', ['Muanda' => ['Centre', 'Plage']]],
        ],
        'HKA' => [
            ['Lubumbashi', 'ville', [
                'Lubumbashi' => ['Centre-ville', 'Makutano'],
                'Kampemba' => ['Bel-Air', 'Industriel'],
                'Katuba' => ['Katuba I', 'Katuba II'],
                'Ruashi' => ['Luwowoshi'],
            ]],
            ['Likasi', 'ville', ['Likasi' => ['Centre'], 'Panda' => ['Cité']]],
        ],
        'NKV' => [
            ['Goma', 'ville', ['Goma' => ['Les Volcans', 'Mikeno'], 'Karisimbi' => ['Majengo', 'Virunga']]],
            ['Beni', 'ville', ['Bungulu' => ['Centre'], 'Mulekera' => ['Matonge']]],
        ],
        'SKV' => [
            ['Bukavu', 'ville', ['Ibanda' => ['Nyalukemba', 'Ndendere'], 'Kadutu' => ['Nyakaliba'], 'Bagira' => ['Nkafu']]],
        ],
        'KSC' => [
            ['Kananga', 'ville', ['Kananga' => ['Malandji'], 'Ndesha' => ['Tshinsambi'], 'Katoka' => ['Centre']]],
        ],
        'KSO' => [
            ['Mbuji-Mayi', 'ville', ['Dibindi' => ['Centre'], 'Bipemba' => ['Cité'], 'Diulu' => ['Marché']]],
        ],
        'TSH' => [
            ['Kisangani', 'ville', ['Makiso' => ['Centre-ville'], 'Tshopo' => ['Plateau'], 'Kabondo' => ['Cité']]],
        ],
        'EQU' => [
            ['Mbandaka', 'ville', ['Mbandaka' => ['Centre'], 'Wangata' => ['Bongondjo']]],
        ],
        'LUA' => [
            ['Kolwezi', 'ville', ['Dilala' => ['Centre'], 'Manika' => ['Cité']]],
        ],
    ];

    public function run(): void
    {
        foreach (self::PROVINCES as [$code, $name, $chiefTown, $latitude, $longitude]) {
            $province = Province::updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'chief_town' => $chiefTown,
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                    'is_active' => true,
                ],
            );

            foreach (self::CITIES[$code] ?? [] as [$cityName, $cityType, $communes]) {
                $city = City::updateOrCreate(
                    ['province_id' => $province->id, 'name' => $cityName],
                    ['type' => $cityType, 'is_active' => true],
                );

                foreach ($communes as $communeName => $zones) {
                    $commune = Commune::updateOrCreate(
                        ['city_id' => $city->id, 'name' => $communeName],
                        ['province_id' => $province->id, 'type' => 'commune', 'is_active' => true],
                    );

                    foreach ($zones as $zoneName) {
                        Zone::updateOrCreate(
                            ['commune_id' => $commune->id, 'name' => $zoneName],
                            [
                                'city_id' => $city->id,
                                'province_id' => $province->id,
                                'type' => 'quartier',
                                'is_active' => true,
                            ],
                        );
                    }
                }
            }
        }
    }
}
