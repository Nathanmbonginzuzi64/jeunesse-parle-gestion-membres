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

        return response()->json([
            'scope' => [
                'level' => $user->scopeLevel(),
                'role' => $user->role?->name,
                'province' => $user->province?->name,
                'city' => $user->city?->name,
                'structure' => $user->structure?->name,
            ],
            'kpis' => $this->statistics->overview($user),
            'recent' => $this->statistics->recentActivity($user),
        ]);
    }

    public function charts(Request $request): JsonResponse
    {
        $user = $request->user();
        $months = min(max($request->integer('months', 12), 3), 36);

        return response()->json([
            'registrations_trend' => $this->statistics->registrationsTrend($user, $months),
            'by_status' => $this->statistics->byStatus($user),
            'by_province' => $this->statistics->byProvince($user),
            'by_city' => $this->statistics->byCity($user, $request->integer('province_id') ?: null),
            'by_gender' => $this->statistics->byGender($user),
            'by_age_range' => $this->statistics->byAgeRange($user),
            'by_profession' => $this->statistics->byProfession($user),
            'top_skills' => $this->statistics->topSkills($user),
        ]);
    }

    public function byProvince(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->statistics->byProvince($request->user())]);
    }

    public function byCity(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->statistics->byCity($request->user(), $request->integer('province_id') ?: null),
        ]);
    }

    public function byCommune(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->statistics->byCommune($request->user(), $request->integer('city_id') ?: null),
        ]);
    }
}
