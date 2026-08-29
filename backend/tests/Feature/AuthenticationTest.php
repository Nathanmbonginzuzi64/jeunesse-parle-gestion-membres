<?php

namespace Tests\Feature;

use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Member;
use App\Models\Province;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private Province $province;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        $this->province = $this->makeProvince('KIN', 'Kinshasa');
    }

    public function test_inscription_publique_cree_un_dossier_en_attente(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'last_name' => 'Mbongi',
            'middle_name' => 'Kabeya',
            'first_name' => 'Nathan',
            'gender' => 'M',
            'birth_date' => now()->subYears(22)->toDateString(),
            'phone' => '+243811111111',
            'email' => 'nathan.test@example.cd',
            'password' => 'MotDePasse2026',
            'password_confirmation' => 'MotDePasse2026',
            'province_id' => $this->province->id,
            'consent_given' => true,
        ]);

        $response->assertCreated()->assertJsonStructure(['token', 'member_code', 'user']);

        $member = Member::where('member_code', $response->json('member_code'))->firstOrFail();

        $this->assertSame(MemberStatus::Pending, $member->status);
        $this->assertNull($member->activeCard()->first(), 'Aucune carte ne doit être émise avant validation.');
    }

    public function test_inscription_refusee_si_le_telephone_est_deja_utilise(): void
    {
        $this->makeUser(RoleSlug::Membre, ['phone' => '+243812222222']);

        $this->postJson('/api/auth/register', [
            'last_name' => 'Doublon',
            'first_name' => 'Test',
            'gender' => 'F',
            'birth_date' => now()->subYears(20)->toDateString(),
            'phone' => '+243812222222',
            'password' => 'MotDePasse2026',
            'password_confirmation' => 'MotDePasse2026',
            'province_id' => $this->province->id,
            'consent_given' => true,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('phone');
    }

    public function test_inscription_refusee_sans_consentement(): void
    {
        $this->postJson('/api/auth/register', [
            'last_name' => 'Sans',
            'first_name' => 'Consentement',
            'gender' => 'M',
            'birth_date' => now()->subYears(20)->toDateString(),
            'phone' => '+243813333333',
            'password' => 'MotDePasse2026',
            'password_confirmation' => 'MotDePasse2026',
            'province_id' => $this->province->id,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('consent_given');
    }

    public function test_connexion_avec_email_puis_avec_telephone(): void
    {
        $user = $this->makeUser(RoleSlug::AdminNational, [
            'email' => 'admin.test@example.cd',
            'phone' => '+243814444444',
        ]);

        $this->postJson('/api/auth/login', [
            'login' => 'admin.test@example.cd',
            'password' => 'MotDePasse!2026',
        ])->assertOk()->assertJsonStructure(['token', 'user']);

        $this->postJson('/api/auth/login', [
            'login' => '+243814444444',
            'password' => 'MotDePasse!2026',
        ])->assertOk();

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_connexion_refusee_avec_un_mauvais_mot_de_passe(): void
    {
        $this->makeUser(RoleSlug::AdminNational, ['email' => 'admin2.test@example.cd']);

        $this->postJson('/api/auth/login', [
            'login' => 'admin2.test@example.cd',
            'password' => 'MauvaisMotDePasse',
        ])->assertStatus(422)->assertJsonValidationErrors('login');
    }

    public function test_le_compte_se_verrouille_apres_plusieurs_echecs(): void
    {
        $user = $this->makeUser(RoleSlug::AdminNational, ['email' => 'verrou.test@example.cd']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/login', [
                'login' => 'verrou.test@example.cd',
                'password' => 'Mauvais'.$i,
            ]);
        }

        $this->assertTrue($user->fresh()->isLocked());

        // Même avec le bon mot de passe, l'accès reste bloqué pendant le verrouillage.
        $this->postJson('/api/auth/login', [
            'login' => 'verrou.test@example.cd',
            'password' => 'MotDePasse!2026',
        ])->assertStatus(422);
    }

    public function test_un_compte_desactive_ne_peut_pas_se_connecter(): void
    {
        $this->makeUser(RoleSlug::AdminNational, [
            'email' => 'inactif.test@example.cd',
            'is_active' => false,
        ]);

        $this->postJson('/api/auth/login', [
            'login' => 'inactif.test@example.cd',
            'password' => 'MotDePasse!2026',
        ])->assertStatus(422);
    }

    public function test_me_renvoie_le_profil_et_les_permissions(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);

        $response = $this->actingAs($admin)->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonPath('user.role.slug', RoleSlug::AdminNational->value);

        $this->assertContains('members.view', $response->json('user.permissions'));
        $this->assertNotContains('settings.manage', $response->json('user.permissions'));
    }

    public function test_le_super_admin_dispose_de_toutes_les_permissions(): void
    {
        $superAdmin = $this->makeUser(RoleSlug::SuperAdmin);

        $response = $this->actingAs($superAdmin)->getJson('/api/auth/me');

        $this->assertContains('settings.manage', $response->json('user.permissions'));
        $this->assertContains('roles.manage', $response->json('user.permissions'));
    }

    public function test_le_mot_de_passe_n_est_jamais_renvoye_par_l_api(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational);

        $response = $this->actingAs($admin)->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.two_factor_secret')
            ->assertJsonMissingPath('user.remember_token');

        $this->assertStringNotContainsString($admin->getAuthPassword(), $response->getContent());
    }

    public function test_la_deconnexion_revoque_le_jeton(): void
    {
        $admin = $this->makeUser(RoleSlug::AdminNational, ['email' => 'logout.test@example.cd']);

        $token = $this->postJson('/api/auth/login', [
            'login' => 'logout.test@example.cd',
            'password' => 'MotDePasse!2026',
        ])->json('token');

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertSame(0, User::find($admin->id)->tokens()->count());
    }

    public function test_la_demande_de_reinitialisation_ne_revele_pas_l_existence_d_un_compte(): void
    {
        $this->postJson('/api/auth/forgot-password', ['login' => 'inconnu@example.cd'])
            ->assertOk()
            ->assertJsonPath('message', 'Si un compte correspond, les instructions de réinitialisation ont été envoyées.');
    }
}
