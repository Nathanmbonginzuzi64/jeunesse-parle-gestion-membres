<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\StatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatisticsController extends Controller
{
    public function __construct(private readonly StatisticsService $statistics) {}

    /** Tableau de bord : les chiffres sont ceux du périmètre de l'utilisateur. */
    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();
        $filters = $this->chartFilters($request);

        return response()->json([
            'scope' => [
                'level' => $user->scopeLevel(),
                'role' => $user->role?->name,
                'province' => $user->province?->name,
                'city' => $user->city?->name,
                'structure' => $user->structure?->name,
            ],
            'kpis' => $this->statistics->overview($user, $filters),
            'recent' => $this->statistics->recentActivity($user),
        ]);
    }

    public function charts(Request $request): JsonResponse
    {
        $user = $request->user();
        $months = min(max($request->integer('months', 12), 3), 36);
        $filters = $this->chartFilters($request);

        return response()->json([
            'registrations_trend' => $this->statistics->registrationsTrend($user, $months, $filters),
            'by_status' => $this->statistics->byStatus($user, $filters),
            'by_province' => $this->statistics->byProvince($user, $filters),
            'by_city' => $this->statistics->byCity($user, $request->integer('province_id') ?: null, $filters),
            'by_gender' => $this->statistics->byGender($user, $filters),
            'by_age_range' => $this->statistics->byAgeRange($user, $filters),
            'by_profession' => $this->statistics->byProfession($user, 10, $filters),
            'top_skills' => $this->statistics->topSkills($user, 12, $filters),
            'by_activity' => $this->statistics->byActivity($user, $filters),
        ]);
    }

    public function byProvince(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->statistics->byProvince($request->user(), $this->chartFilters($request)),
        ]);
    }

    public function byCity(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->statistics->byCity(
                $request->user(),
                $request->integer('province_id') ?: null,
                $this->chartFilters($request),
            ),
        ]);
    }

    public function byCommune(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->statistics->byCommune(
                $request->user(),
                $request->integer('city_id') ?: null,
                $this->chartFilters($request),
            ),
        ]);
    }

    private function chartFilters(Request $request): array
    {
        return array_filter([
            'period' => $request->input('period'),
            'status' => $request->input('status'),
            'province_id' => $request->integer('province_id') ?: null,
            'city_id' => $request->integer('city_id') ?: null,
            'commune_id' => $request->integer('commune_id') ?: null,
            'zone_id' => $request->integer('zone_id') ?: null,
            'structure_id' => $request->integer('structure_id') ?: null,
        ], fn ($v) => $v !== null && $v !== '');
    }
}
