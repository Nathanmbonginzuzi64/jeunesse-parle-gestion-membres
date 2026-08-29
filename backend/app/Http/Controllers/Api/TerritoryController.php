<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Référentiel territorial servi depuis la base : aucune donnée administrative
 * n'est codée en dur côté frontend.
 */
class TerritoryController extends Controller
{
    public function provinces(): JsonResponse
    {
        return response()->json([
            'data' => Province::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'chief_town', 'latitude', 'longitude']),
        ]);
    }

    public function cities(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
        ]);

        return response()->json([
            'data' => City::query()
                ->where('is_active', true)
                ->when($validated['province_id'] ?? null, fn ($q, $v) => $q->where('province_id', $v))
                ->orderBy('name')
                ->get(['id', 'province_id', 'name', 'type']),
        ]);
    }

    public function communes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
        ]);

        return response()->json([
            'data' => Commune::query()
                ->where('is_active', true)
                ->when($validated['city_id'] ?? null, fn ($q, $v) => $q->where('city_id', $v))
                ->when($validated['province_id'] ?? null, fn ($q, $v) => $q->where('province_id', $v))
                ->orderBy('name')
                ->get(['id', 'city_id', 'province_id', 'name', 'type']),
        ]);
    }

    public function zones(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'commune_id' => ['nullable', 'integer', 'exists:communes,id'],
        ]);

        return response()->json([
            'data' => Zone::query()
                ->where('is_active', true)
                ->when($validated['commune_id'] ?? null, fn ($q, $v) => $q->where('commune_id', $v))
                ->orderBy('name')
                ->get(['id', 'commune_id', 'city_id', 'province_id', 'name', 'type']),
        ]);
    }

    /** Catalogue public des structures actives : identifiant et nom uniquement. */
    public function structures(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'province_id' => ['nullable', 'integer', 'exists:provinces,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
        ]);

        return response()->json([
            'data' => \App\Models\Structure::query()
                ->where('is_active', true)
                ->when($validated['province_id'] ?? null, fn ($q, $v) => $q->where('province_id', $v))
                ->when($validated['city_id'] ?? null, fn ($q, $v) => $q->where('city_id', $v))
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'province_id', 'city_id']),
        ]);
    }
}
