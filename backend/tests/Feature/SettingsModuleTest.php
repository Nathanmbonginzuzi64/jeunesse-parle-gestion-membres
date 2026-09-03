<?php

namespace Tests\Feature;

use App\Enums\RoleSlug;
use App\Models\Setting;
use App\Models\UserPreference;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsModuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    public function test_membre_ne_peut_pas_lire_les_settings_plateforme(): void
    {
        $user = $this->makeUser(RoleSlug::Membre);

        $this->actingAs($user)->getJson('/api/settings')->assertForbidden();
    }

    public function test_super_admin_peut_lire_les_settings_plateforme(): void
    {
        $user = $this->makeUser(RoleSlug::SuperAdmin);

        $this->actingAs($user)->getJson('/api/settings')->assertOk();
    }

    public function test_utilisateur_gere_ses_sessions_uniquement(): void
    {
        $user = $this->makeUser(RoleSlug::Membre);
        $other = $this->makeUser(RoleSlug::AdminNational);

        $mine = $user->createToken('web');
        $otherToken = $other->createToken('web');
        $second = $user->createToken('mobile');

        $this->withToken($mine->plainTextToken)
            ->getJson('/api/auth/sessions')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->withToken($mine->plainTextToken)
            ->deleteJson('/api/auth/sessions/'.$otherToken->accessToken->id)
            ->assertNotFound();

        $this->withToken($mine->plainTextToken)
            ->deleteJson('/api/auth/sessions/'.$second->accessToken->id)
            ->assertOk();

        $this->withToken($mine->plainTextToken)
            ->deleteJson('/api/auth/sessions/'.$mine->accessToken->id)
            ->assertStatus(422);
    }

    public function test_preferences_utilisateur_sont_persistées_et_restreintes(): void
    {
        $user = $this->makeUser(RoleSlug::Membre);

        $this->actingAs($user)
            ->putJson('/api/user-preferences', [
                'who_can_contact' => 'nobody',
                'phone_visibility' => 'everyone',
                'theme' => 'dark',
            ])
            ->assertOk()
            ->assertJsonPath('data.who_can_contact', 'nobody')
            ->assertJsonPath('data.phone_visibility', 'contacts')
            ->assertJsonPath('data.theme', 'dark');

        $prefs = UserPreference::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertSame('contacts', $prefs->phone_visibility);
    }

    public function test_maintenance_bloque_hors_super_admin(): void
    {
        Setting::put('maintenance', true, 'boolean', 'systeme', 'Maintenance');

        $member = $this->makeUser(RoleSlug::Membre);

        $this->actingAs($member)->getJson('/api/auth/me')->assertOk();
        $this->actingAs($member)->getJson('/api/notification-preferences')->assertStatus(503);

        $admin = $this->makeUser(RoleSlug::SuperAdmin);
        $this->actingAs($admin)->getJson('/api/settings')->assertOk();
    }
}
