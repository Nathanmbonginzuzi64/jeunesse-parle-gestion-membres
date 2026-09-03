<?php

namespace Tests\Feature;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\RoleSlug;
use App\Models\Activity;
use App\Models\Province;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentAttendanceActivitiesTest extends TestCase
{
    use RefreshDatabase;

    private Province $province;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        $this->province = $this->makeProvince('KIN', 'Kinshasa');
    }

    public function test_agent_ne_peut_pas_lister_toutes_les_activites_via_index(): void
    {
        $agent = $this->makeUser(RoleSlug::AgentVerification);

        $this->actingAs($agent)->getJson('/api/activities')->assertForbidden();
    }

    public function test_agent_peut_lister_les_activites_pour_pointage(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);
        $agent = $this->makeUser(RoleSlug::AgentVerification);

        Activity::create([
            'code' => 'JP-ACT-TEST001',
            'title' => 'Assemblée de terrain',
            'type' => ActivityType::Reunion->value,
            'status' => ActivityStatus::Ongoing->value,
            'starts_at' => now()->subHour(),
            'ends_at' => now()->addHour(),
            'province_id' => $this->province->id,
            'organizer_id' => $admin->id,
            'is_public' => true,
        ]);

        Activity::create([
            'code' => 'JP-ACT-TEST002',
            'title' => 'Activité terminée',
            'type' => ActivityType::Reunion->value,
            'status' => ActivityStatus::Completed->value,
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subDay(),
            'province_id' => $this->province->id,
            'organizer_id' => $admin->id,
            'is_public' => true,
        ]);

        $this->actingAs($agent)
            ->getJson('/api/activities/for-attendance')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'JP-ACT-TEST001');
    }

    public function test_membre_ne_peut_pas_utiliser_for_attendance(): void
    {
        $member = $this->makeUser(RoleSlug::Membre);

        $this->actingAs($member)->getJson('/api/activities/for-attendance')->assertForbidden();
    }
}
