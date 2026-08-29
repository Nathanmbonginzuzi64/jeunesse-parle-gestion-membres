<?php

namespace Tests\Feature;

use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le cloisonnement territorial est la garantie de sécurité la plus critique
 * du système : ces tests vérifient qu'aucun chemin d'accès ne la contourne.
 */
class TerritorialScopeTest extends TestCase
{
    use RefreshDatabase;

    private Member $kinshasaMember;
    private Member $goma1Member;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();

        $kinshasa = $this->makeProvince('KIN', 'Kinshasa');
        $nordKivu = $this->makeProvince('NKV', 'Nord-Kivu');

        $this->kinshasaMember = Member::factory()->create([
            'province_id' => $kinshasa->id,
            'status' => MemberStatus::Active,
        ]);

        $this->goma1Member = Member::factory()->create([
            'province_id' => $nordKivu->id,
            'status' => MemberStatus::Active,
        ]);
    }

    public function test_un_responsable_provincial_ne_voit_que_les_membres_de_sa_province(): void
    {
        $responsable = $this->makeUser(RoleSlug::ResponsableProvincial, [
            'province_id' => $this->kinshasaMember->province_id,
        ]);

        $response = $this->actingAs($responsable)->getJson('/api/members');

        $response->assertOk();

        $codes = collect($response->json('data'))->pluck('member_code');

        $this->assertContains($this->kinshasaMember->member_code, $codes);
        $this->assertNotContains($this->goma1Member->member_code, $codes);
        $this->assertCount(1, $codes);
    }

    public function test_un_responsable_provincial_ne_peut_pas_ouvrir_la_fiche_d_une_autre_province(): void
    {
        $responsable = $this->makeUser(RoleSlug::ResponsableProvincial, [
            'province_id' => $this->kinshasaMember->province_id,
        ]);

        $this->actingAs($responsable)
            ->getJson('/api/members/'.$this->goma1Member->id)
            ->assertForbidden();
    }

    public function test_un_responsable_provincial_ne_peut_pas_modifier_un_membre_d_une_autre_province(): void
    {
        $responsable = $this->makeUser(RoleSlug::ResponsableProvincial, [
            'province_id' => $this->kinshasaMember->province_id,
        ]);

        $this->actingAs($responsable)
            ->putJson('/api/members/'.$this->goma1Member->id, ['first_name' => 'Piraté'])
            ->assertForbidden();

        $this->assertNotSame('Piraté', $this->goma1Member->fresh()->first_name);
    }

    public function test_un_responsable_ne_peut_pas_creer_un_membre_hors_de_sa_province(): void
    {
        $responsable = $this->makeUser(RoleSlug::ResponsableProvincial, [
            'province_id' => $this->kinshasaMember->province_id,
        ]);

        $this->actingAs($responsable)
            ->postJson('/api/members', [
                'last_name' => 'Test',
                'first_name' => 'Intrusion',
                'gender' => 'M',
                'phone' => '+243810000001',
                'province_id' => $this->goma1Member->province_id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('province_id');
    }

    public function test_les_statistiques_sont_limitees_au_perimetre_du_responsable(): void
    {
        $responsable = $this->makeUser(RoleSlug::ResponsableProvincial, [
            'province_id' => $this->kinshasaMember->province_id,
        ]);

        $response = $this->actingAs($responsable)->getJson('/api/statistics');

        $response->assertOk();
        $this->assertSame(1, $response->json('kpis.members.total'));
    }

    public function test_un_admin_national_voit_tous_les_membres(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);

        $response = $this->actingAs($admin)->getJson('/api/members');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }
}
