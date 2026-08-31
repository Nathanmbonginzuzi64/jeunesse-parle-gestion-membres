<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Avenue;
use App\Models\City;
use App\Models\Commune;
use App\Models\District;
use App\Models\Province;
use App\Models\Zone;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Création des entités du référentiel territorial (province → ville → commune → quartier).
 */
class TerritoryManagementController extends Controller
{
    public function __construct(private readonly AuditLogger $audit) {}

    public function storeProvince(Request $request): JsonResponse
    {
        $this->authorizeTerritories();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['nullable', 'string', 'max:10', 'unique:provinces,code'],
            'chief_town' => ['nullable', 'string', 'max:120'],
        ]);

        $code = $validated['code'] ?? $this->generateCode($validated['name']);

        $province = Province::create([
            'name' => $validated['name'],
            'code' => strtoupper($code),
            'chief_town' => $validated['chief_town'] ?? null,
            'is_active' => true,
        ]);

        $this->audit->log('territory.province.created', $province, "Province {$province->name} créée");

        return response()->json([
            'message' => 'Province ajoutée.',
            'data' => $province->only(['id', 'code', 'name', 'chief_town']),
        ], 201);
    }

    public function storeCity(Request $request): JsonResponse
    {
        $this->authorizeTerritories();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'type' => ['nullable', Rule::in(['ville', 'territoire'])],
        ]);

        $city = City::create([
            'province_id' => $validated['province_id'],
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'ville',
            'is_active' => true,
        ]);

        $this->audit->log('territory.city.created', $city, "Ville {$city->name} créée");

        return response()->json([
            'message' => 'Ville ajoutée.',
            'data' => $city->only(['id', 'province_id', 'name', 'type']),
        ], 201);
    }

    public function storeDistrict(Request $request): JsonResponse
    {
        $this->authorizeTerritories();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'type' => ['nullable', Rule::in(['district'])],
        ]);

        $city = City::query()->findOrFail($validated['city_id']);
        if ($city->province_id !== (int) $validated['province_id']) {
            return response()->json([
                'message' => 'La ville sélectionnée n\'appartient pas à cette province.',
                'errors' => ['city_id' => ['Incohérence province / ville.']],
            ], 422);
        }

        $district = District::create([
            'city_id' => $validated['city_id'],
            'province_id' => $validated['province_id'],
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'district',
            'is_active' => true,
        ]);

        $this->audit->log('territory.district.created', $district, "District {$district->name} créé");

        return response()->json([
            'message' => 'District ajouté.',
            'data' => $district->only(['id', 'city_id', 'province_id', 'name', 'type']),
        ], 201);
    }

    public function storeCommune(Request $request): JsonResponse
    {
        $this->authorizeTerritories();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'city_id' => ['required', 'integer', 'exists:cities,id'],
            'province_id' => ['required', 'integer', 'exists:provinces,id'],
            'district_id' => ['nullable', 'integer', 'exists:districts,id'],
            'type' => ['nullable', Rule::in(['commune', 'secteur', 'chefferie'])],
        ]);

        $city = City::query()->findOrFail($validated['city_id']);
        if ($city->province_id !== (int) $validated['province_id']) {
            return response()->json([
                'message' => 'La ville sélectionnée n\'appartient pas à cette province.',
                'errors' => ['city_id' => ['Incohérence province / ville.']],
            ], 422);
        }

        if (! empty($validated['district_id'])) {
            $district = District::query()->findOrFail($validated['district_id']);
            if ($district->city_id !== (int) $validated['city_id']) {
                return response()->json([
                    'message' => 'Le district sélectionné n\'appartient pas à cette ville.',
                    'errors' => ['district_id' => ['Incohérence ville / district.']],
                ], 422);
            }
        }

        $commune = Commune::create([
            'city_id' => $validated['city_id'],
            'province_id' => $validated['province_id'],
            'district_id' => $validated['district_id'] ?? null,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'commune',
            'is_active' => true,
        ]);

        $this->audit->log('territory.commune.created', $commune, "Commune {$commune->name} créée");

        return response()->json([
            'message' => 'Commune ajoutée.',
            'data' => $commune->only(['id', 'city_id', 'province_id', 'district_id', 'name', 'type']),
        ], 201);
    }

    public function storeQuartier(Request $request): JsonResponse
    {
        $this->authorizeTerritories();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'commune_id' => ['required', 'integer', 'exists:communes,id'],
            'type' => ['nullable', Rule::in(['quartier', 'groupement'])],
        ]);

        $commune = Commune::query()->findOrFail($validated['commune_id']);

        $zone = Zone::create([
            'commune_id' => $commune->id,
            'city_id' => $commune->city_id,
            'province_id' => $commune->province_id,
            'name' => $validated['name'],
            'type' => $validated['type'] ?? 'quartier',
            'is_active' => true,
        ]);

        $this->audit->log('territory.zone.created', $zone, "Quartier {$zone->name} créé");

        return response()->json([
            'message' => 'Quartier ajouté.',
            'data' => $zone->only(['id', 'commune_id', 'city_id', 'province_id', 'name', 'type']),
        ], 201);
    }

    public function storeAvenue(Request $request): JsonResponse
    {
        $this->authorizeTerritories();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'zone_id' => ['required', 'integer', 'exists:zones,id'],
            'number' => ['nullable', 'string', 'max:30'],
            'direction' => ['nullable', Rule::in([
                'nord', 'sud', 'est', 'ouest',
                'nord-est', 'nord-ouest', 'sud-est', 'sud-ouest', 'centre',
            ])],
            'reference_stop' => ['nullable', 'string', 'max:160'],
        ]);

        $zone = Zone::query()->findOrFail($validated['zone_id']);

        $avenue = Avenue::create([
            'zone_id' => $zone->id,
            'commune_id' => $zone->commune_id,
            'city_id' => $zone->city_id,
            'province_id' => $zone->province_id,
            'name' => $validated['name'],
            'number' => $validated['number'] ?? null,
            'direction' => $validated['direction'] ?? null,
            'reference_stop' => $validated['reference_stop'] ?? null,
            'is_active' => true,
        ]);

        $this->audit->log('territory.avenue.created', $avenue, "Avenue {$avenue->name} créée");

        return response()->json([
            'message' => 'Avenue ajoutée.',
            'data' => $avenue->only(['id', 'zone_id', 'commune_id', 'city_id', 'province_id', 'name', 'number', 'direction', 'reference_stop']),
        ], 201);
    }

    private function authorizeTerritories(): void
    {
        abort_unless(
            request()->user()?->hasPermission(\App\Enums\Permission::TerritoriesManage),
            403,
            'Action non autorisée.',
        );
    }

    private function generateCode(string $name): string
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $code = '';
        foreach ($parts as $part) {
            $code .= mb_strtoupper(mb_substr($part, 0, 1));
            if (mb_strlen($code) >= 3) {
                break;
            }
        }

        return $code !== '' ? $code : 'PRV';
    }
}
