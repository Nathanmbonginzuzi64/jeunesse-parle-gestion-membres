<?php

namespace Tests\Feature;

use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Member;
use App\Models\Province;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionTest extends TestCase
{
    use RefreshDatabase;

    private Province $province;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        $this->province = $this->makeProvince('KIN', 'Kinshasa');
    }

    public function test_un_membre_ne_peut_pas_lister_les_membres(): void
    {
        $member = Member::factory()->create(['province_id' => $this->province->id]);
        $user = $this->makeUser(RoleSlug::Membre, ['member_id' => $member->id]);

        $this->actingAs($user)->getJson('/api/members')->assertForbidden();
    }

    public function test_un_membre_ne_peut_pas_acceder_aux_statistiques(): void
    {
        $member = Member::factory()->create(['province_id' => $this->province->id]);
        $user = $this->makeUser(RoleSlug::Membre, ['member_id' => $member->id]);

        $this->actingAs($user)->getJson('/api/statistics')->assertForbidden();
    }

    public function test_un_membre_ne_peut_pas_consulter_le_journal_d_audit(): void
    {
        $member = Member::factory()->create(['province_id' => $this->province->id]);
        $user = $this->makeUser(RoleSlug::Membre, ['member_id' => $member->id]);

        $this->actingAs($user)->getJson('/api/audit')->assertForbidden();
    }

    public function test_un_membre_accede_a_son_propre_dossier(): void
    {
        $member = Member::factory()->create(['province_id' => $this->province->id]);
        $user = $this->makeUser(RoleSlug::Membre, ['member_id' => $member->id]);

        $this->actingAs($user)
            ->getJson('/api/members/'.$member->id)
            ->assertOk()
            ->assertJsonPath('data.member_code', $member->member_code);
    }

    public function test_un_membre_ne_peut_pas_consulter_le_dossier_d_un_autre(): void
    {
        $mine = Member::factory()->create(['province_id' => $this->province->id]);
        $other = Member::factory()->create(['province_id' => $this->province->id]);
        $user = $this->makeUser(RoleSlug::Membre, ['member_id' => $mine->id]);

        $this->actingAs($user)->getJson('/api/members/'.$other->id)->assertForbidden();
    }

    public function test_un_membre_ne_peut_pas_valider_un_dossier(): void
    {
        $mine = Member::factory()->create(['province_id' => $this->province->id]);
        $pending = Member::factory()->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Pending,
        ]);
        $user = $this->makeUser(RoleSlug::Membre, ['member_id' => $mine->id]);

        $this->actingAs($user)
            ->postJson('/api/members/'.$pending->id.'/validate')
            ->assertForbidden();

        $this->assertSame(MemberStatus::Pending, $pending->fresh()->status);
    }

    public function test_un_agent_de_verification_ne_peut_pas_creer_de_membre(): void
    {
        $agent = $this->makeUser(RoleSlug::AgentVerification);

        $this->actingAs($agent)
            ->postJson('/api/members', [
                'last_name' => 'Test',
                'first_name' => 'Agent',
                'gender' => 'M',
                'phone' => '+243810000002',
                'province_id' => $this->province->id,
            ])
            ->assertForbidden();
    }

    public function test_un_responsable_local_ne_peut_pas_exporter_les_membres(): void
    {
        $structure = $this->makeStructure($this->province);
        $responsable = $this->makeUser(RoleSlug::ResponsableLocal, [
            'province_id' => $this->province->id,
            'structure_id' => $structure->id,
        ]);

        $this->actingAs($responsable)->getJson('/api/members/export')->assertForbidden();
    }

    public function test_un_compte_desactive_est_rejete(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational, ['is_active' => false]);

        $this->actingAs($admin)->getJson('/api/members')->assertForbidden();
    }

    public function test_les_routes_protegees_exigent_une_authentification(): void
    {
        $this->getJson('/api/members')->assertUnauthorized();
        $this->getJson('/api/statistics')->assertUnauthorized();
        $this->getJson('/api/audit')->assertUnauthorized();
    }
}
