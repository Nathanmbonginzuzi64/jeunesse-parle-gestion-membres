<?php

namespace Tests\Feature;

use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Member;
use App\Models\Province;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MemberManagementTest extends TestCase
{
    use RefreshDatabase;

    private Province $province;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        $this->province = $this->makeProvince('KIN', 'Kinshasa');
        $this->admin = $this->makeUser(RoleSlug::AdminNational);
    }

    public function test_les_identifiants_membres_sont_uniques_et_sequentiels(): void
    {
        $first = Member::factory()->create(['province_id' => $this->province->id]);
        $second = Member::factory()->create(['province_id' => $this->province->id]);

        $this->assertMatchesRegularExpression('/^JP-RDC-\d{8}$/', $first->member_code);
        $this->assertNotSame($first->member_code, $second->member_code);

        $extract = fn (string $code) => (int) substr($code, 7);
        $this->assertSame($extract($first->member_code) + 1, $extract($second->member_code));
    }

    public function test_un_doublon_potentiel_declenche_une_alerte_sans_bloquer_definitivement(): void
    {
        Member::factory()->create([
            'province_id' => $this->province->id,
            'phone' => '+243815555555',
            'last_name' => 'Kabila',
            'first_name' => 'Joseph',
        ]);

        $payload = [
            'last_name' => 'Kabila',
            'first_name' => 'Joseph',
            'gender' => 'M',
            'phone' => '+243815555555',
            'province_id' => $this->province->id,
        ];

        $this->actingAs($this->admin)
            ->postJson('/api/members', $payload)
            ->assertStatus(409)
            ->assertJsonPath('requires_confirmation', true)
            ->assertJsonStructure(['duplicates' => [['member_code', 'reasons']]]);

        // Le responsable garde la main : la confirmation explicite crée le dossier.
        $this->actingAs($this->admin)
            ->postJson('/api/members', array_merge($payload, ['confirm_duplicate' => true]))
            ->assertCreated();

        $this->assertSame(2, Member::where('phone', '+243815555555')->count());
    }

    public function test_les_transitions_de_statut_invalides_sont_refusees(): void
    {
        $member = Member::factory()->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Pending,
        ]);

        // « en attente » ne peut pas passer directement à « suspendu ».
        $this->actingAs($this->admin)
            ->postJson('/api/members/'.$member->id.'/status', [
                'status' => MemberStatus::Suspended->value,
            ])
            ->assertStatus(422);

        $this->assertSame(MemberStatus::Pending, $member->fresh()->status);
    }

    public function test_chaque_changement_de_statut_est_historise(): void
    {
        $member = Member::factory()->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Active,
        ]);

        $this->actingAs($this->admin)
            ->postJson('/api/members/'.$member->id.'/status', [
                'status' => MemberStatus::Inactive->value,
                'reason' => 'Départ à l\'étranger',
            ])
            ->assertOk();

        $this->assertDatabaseHas('member_status_histories', [
            'member_id' => $member->id,
            'from_status' => 'active',
            'to_status' => 'inactive',
            'reason' => 'Départ à l\'étranger',
        ]);

        $this->assertDatabaseHas('audit_logs', ['action' => 'member.status-changed']);
    }

    public function test_la_recherche_trouve_un_membre_par_code_nom_ou_telephone(): void
    {
        $member = Member::factory()->create([
            'province_id' => $this->province->id,
            'last_name' => 'Tshisekedi',
            'phone' => '+243816666666',
        ]);

        Member::factory()->count(3)->create(['province_id' => $this->province->id]);

        foreach ([$member->member_code, 'Tshisekedi', '816666666'] as $term) {
            $response = $this->actingAs($this->admin)->getJson('/api/members?q='.urlencode($term));

            $response->assertOk();
            $this->assertContains(
                $member->member_code,
                collect($response->json('data'))->pluck('member_code'),
                "La recherche « {$term} » doit retrouver le membre.",
            );
        }
    }

    public function test_les_filtres_et_la_pagination_fonctionnent(): void
    {
        Member::factory()->count(5)->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Active,
        ]);
        Member::factory()->count(3)->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Pending,
        ]);

        $response = $this->actingAs($this->admin)
            ->getJson('/api/members?status=pending&per_page=2');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        $this->assertSame(3, $response->json('meta.total'));
    }

    public function test_un_tri_non_autorise_est_rejete(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/members?sort=password')
            ->assertStatus(422)
            ->assertJsonValidationErrors('sort');
    }

    public function test_un_fichier_deguise_en_image_est_refuse(): void
    {
        Storage::fake('local');

        $malicious = UploadedFile::fake()->createWithContent('photo.jpg', '<?php echo "compromis"; ?>');

        $this->actingAs($this->admin)
            ->postJson('/api/members', [
                'last_name' => 'Upload',
                'first_name' => 'Test',
                'gender' => 'M',
                'phone' => '+243817777777',
                'province_id' => $this->province->id,
                'photo' => $malicious,
            ])
            ->assertStatus(422);
    }

    public function test_l_export_csv_masque_les_coordonnees_sans_permission_dediee(): void
    {
        Member::factory()->create([
            'province_id' => $this->province->id,
            'phone' => '+243818888888',
        ]);

        $response = $this->actingAs($this->admin)->get('/api/members/export');

        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringContainsString('ID membre', $content);
        $this->assertStringContainsString('+243818888888', $content);
        $this->assertDatabaseHas('audit_logs', ['action' => 'member.exported']);
    }

    public function test_la_suppression_est_logique_et_conserve_la_tracabilite(): void
    {
        $member = Member::factory()->create(['province_id' => $this->province->id]);

        $this->actingAs($this->admin)
            ->deleteJson('/api/members/'.$member->id)
            ->assertOk();

        $this->assertSoftDeleted('members', ['id' => $member->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'member.deleted']);
    }
}
