<?php

namespace Tests\Feature;

use App\Enums\CardStatus;
use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Member;
use App\Models\Province;
use App\Services\CardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardAndQrCodeTest extends TestCase
{
    use RefreshDatabase;

    private Province $province;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        $this->province = $this->makeProvince('KIN', 'Kinshasa');
    }

    public function test_la_validation_d_un_membre_genere_identifiant_carte_et_qr_code(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);

        $member = Member::factory()->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Pending,
        ]);

        $this->assertMatchesRegularExpression('/^JP-RDC-\d{8}$/', $member->member_code);

        $this->actingAs($admin)
            ->postJson('/api/members/'.$member->id.'/validate')
            ->assertOk();

        $member->refresh();

        $this->assertSame(MemberStatus::Active, $member->status);
        $this->assertNotNull($member->validated_at);

        $card = $member->activeCard()->first();
        $this->assertNotNull($card);
        $this->assertSame($member->member_code.'-C01', $card->card_number);
        $this->assertNotNull($card->activeQrToken);
    }

    public function test_une_carte_revoquee_rend_le_qr_code_invalide(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);
        $member = Member::factory()->create(['province_id' => $this->province->id]);

        $card = app(CardService::class)->issue($member, $admin);
        $token = $card->activeQrToken->token;

        $this->getJson('/api/verify/'.$token)
            ->assertOk()
            ->assertJson(['valid' => true, 'result' => 'valid']);

        app(CardService::class)->revoke($card, CardStatus::Lost, 'Carte déclarée perdue');

        $this->getJson('/api/verify/'.$token)
            ->assertNotFound()
            ->assertJson(['valid' => false, 'result' => 'revoked']);
    }

    public function test_le_remplacement_d_une_carte_perdue_invalide_l_ancien_qr_et_en_cree_un_nouveau(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);
        $member = Member::factory()->create(['province_id' => $this->province->id]);

        $oldCard = app(CardService::class)->issue($member, $admin);
        $oldToken = $oldCard->activeQrToken->token;

        $this->actingAs($admin)
            ->postJson("/api/members/{$member->id}/cards/{$oldCard->id}/revoke", [
                'status' => CardStatus::Lost->value,
                'reason' => 'Perte déclarée par le membre',
                'reissue' => true,
            ])
            ->assertOk();

        $newCard = $member->fresh()->activeCard()->with('activeQrToken')->first();

        $this->assertNotNull($newCard);
        $this->assertNotSame($oldCard->id, $newCard->id);
        $this->assertSame($member->member_code.'-C02', $newCard->card_number);

        $this->getJson('/api/verify/'.$oldToken)->assertNotFound();
        $this->getJson('/api/verify/'.$newCard->activeQrToken->token)->assertOk();
    }

    public function test_la_suspension_d_un_membre_invalide_sa_carte(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);
        $member = Member::factory()->create(['province_id' => $this->province->id]);

        $card = app(CardService::class)->issue($member, $admin);
        $token = $card->activeQrToken->token;

        $this->actingAs($admin)
            ->postJson('/api/members/'.$member->id.'/status', [
                'status' => MemberStatus::Suspended->value,
                'reason' => 'Manquement au règlement',
            ])
            ->assertOk();

        $this->getJson('/api/verify/'.$token)
            ->assertNotFound()
            ->assertJson(['valid' => false]);
    }

    public function test_un_membre_non_actif_ne_peut_pas_recevoir_de_carte(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);

        $member = Member::factory()->create([
            'province_id' => $this->province->id,
            'status' => MemberStatus::Pending,
        ]);

        $this->actingAs($admin)
            ->postJson('/api/members/'.$member->id.'/card')
            ->assertStatus(422);
    }

    public function test_la_verification_publique_ne_divulgue_pas_les_donnees_sensibles(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);
        $member = Member::factory()->create([
            'province_id' => $this->province->id,
            'email' => 'prive@example.test',
            'address' => 'Adresse confidentielle',
        ]);

        $card = app(CardService::class)->issue($member, $admin);

        $response = $this->getJson('/api/verify/'.$card->activeQrToken->token);

        $response->assertOk();
        $payload = $response->json('member');

        $this->assertSame($member->member_code, $payload['member_code']);
        $this->assertArrayNotHasKey('phone', $payload);
        $this->assertArrayNotHasKey('email', $payload);
        $this->assertArrayNotHasKey('address', $payload);
        $this->assertArrayNotHasKey('birth_date', $payload);
    }

    public function test_un_jeton_inexistant_est_rejete_et_journalise(): void
    {
        $this->getJson('/api/verify/'.str_repeat('a', 48))
            ->assertNotFound()
            ->assertJson(['valid' => false, 'result' => 'not_found']);

        $this->assertDatabaseHas('verification_logs', ['result' => 'not_found']);
    }
}
