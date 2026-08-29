<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MapController extends Controller
{
    public function __construct(private readonly StatisticsService $statistics) {}

    /**
     * Répartition géographique des membres.
     *
     * Uniquement des agrégats par territoire : la position d'un membre n'est
     * jamais exposée, ni au public ni aux administrateurs.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();

        $payload = $this->statistics->mapStatistics($user);

        if ($provinceId = $request->integer('province_id')) {
            $payload['cities'] = $this->statistics->byCity($user, $provinceId);
        }

        if ($cityId = $request->integer('city_id')) {
            $payload['communes'] = $this->statistics->byCommune($user, $cityId);
        }

        return response()->json($payload);
    }

    /** Indique au frontend quel fournisseur cartographique est configuré. */
    public function config(): JsonResponse
    {
        return response()->json([
            'provider' => config('jeunesse.maps.provider'),
            'configured' => filled(config('jeunesse.maps.api_key')),
        ]);
    }
}
