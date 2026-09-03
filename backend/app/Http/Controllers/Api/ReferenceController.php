<?php

namespace App\Http\Controllers\Api;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\AttendanceStatus;
use App\Enums\CardStatus;
use App\Enums\Gender;
use App\Enums\MemberStatus;
use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

/**
 * Listes de référence partagées par le web et le mobile, afin que les libellés
 * ne soient jamais dupliqués dans les clients.
 */
class ReferenceController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'member_statuses' => $this->map(MemberStatus::cases()),
            'card_statuses' => $this->map(CardStatus::cases()),
            'genders' => $this->map(Gender::cases()),
            'activity_types' => $this->map(ActivityType::cases()),
            'activity_statuses' => $this->map(ActivityStatus::cases()),
            'attendance_statuses' => $this->map(AttendanceStatus::cases()),
            'structure_types' => [
                ['value' => 'coordination_nationale', 'label' => 'Coordination nationale'],
                ['value' => 'coordination_provinciale', 'label' => 'Coordination provinciale'],
                ['value' => 'antenne', 'label' => 'Antenne'],
                ['value' => 'cellule', 'label' => 'Cellule'],
                ['value' => 'club', 'label' => 'Club'],
            ],
            'education_levels' => [
                'Sans instruction', 'Primaire', 'Secondaire', 'Diplômé d\'État',
                'Graduat', 'Licence', 'Master', 'Doctorat', 'Formation professionnelle',
            ],
            'employment_statuses' => [
                'Étudiant', 'Élève', 'Sans emploi', 'Employé', 'Indépendant',
                'Entrepreneur', 'Stagiaire', 'Fonctionnaire', 'Bénévole',
            ],
            'organization' => [
                'name' => Setting::get('organization.name', config('jeunesse.organization.name')),
                'country' => Setting::get('organization.country', config('jeunesse.organization.country')),
            ],
            'membership' => [
                'minimum_age' => (int) Setting::get('membership.minimum_age', config('jeunesse.minimum_age')),
                'maximum_age' => (int) Setting::get('membership.maximum_age', config('jeunesse.maximum_age')),
            ],
        ]);
    }

    private function map(array $cases): array
    {
        return array_map(fn ($case) => [
            'value' => $case->value,
            'label' => $case->label(),
        ], $cases);
    }
}
