<?php

namespace Database\Seeders;

use App\Enums\ActivityStatus;
use App\Enums\ActivityType;
use App\Enums\AttendanceStatus;
use App\Enums\MemberStatus;
use App\Enums\RoleSlug;
use App\Models\Activity;
use App\Models\Attendance;
use App\Models\Member;
use App\Models\Province;
use App\Models\Role;
use App\Models\Structure;
use App\Models\User;
use App\Services\CardService;
use App\Services\IdentifierGenerator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Jeu de démonstration destiné aux environnements locaux et de recette.
 *
 * Les mots de passe proviennent de la variable JP_DEMO_PASSWORD : aucun secret
 * réel n'est écrit dans le dépôt, et l'exécution est refusée en production.
 */
class DemoDataSeeder extends Seeder
{
    public function run(CardService $cards, IdentifierGenerator $identifiers): void
    {
        if (app()->environment('production')) {
            $this->command?->warn('DemoDataSeeder ignoré : environnement de production.');

            return;
        }

        $password = env('JP_DEMO_PASSWORD', 'Password!2026');

        $roles = Role::pluck('id', 'slug');
        $kinshasa = Province::where('code', 'KIN')->first();
        $nordKivu = Province::where('code', 'NKV')->first();
        $kinshasaCity = $kinshasa?->cities()->where('name', 'Kinshasa')->first();
        $celluleKintambo = Structure::where('name', 'Cellule Kintambo')->first();
        $coordinationKin = Structure::where('name', 'Coordination Provinciale Kinshasa')->first();

        $accounts = [
            [
                'name' => 'Super Administrateur',
                'email' => 'superadmin@jeunesseparle.test',
                'phone' => '+243900000001',
                'role' => RoleSlug::SuperAdmin,
                'scope' => [],
            ],
            [
                'name' => 'Administrateur National',
                'email' => 'admin@jeunesseparle.test',
                'phone' => '+243900000002',
                'role' => RoleSlug::AdminNational,
                'scope' => [],
            ],
            [
                'name' => 'Responsable Kinshasa',
                'email' => 'kinshasa@jeunesseparle.test',
                'phone' => '+243900000003',
                'role' => RoleSlug::ResponsableProvincial,
                'scope' => ['province_id' => $kinshasa?->id],
            ],
            [
                'name' => 'Responsable Nord-Kivu',
                'email' => 'nordkivu@jeunesseparle.test',
                'phone' => '+243900000004',
                'role' => RoleSlug::ResponsableProvincial,
                'scope' => ['province_id' => $nordKivu?->id],
            ],
            [
                'name' => 'Responsable Ville Kinshasa',
                'email' => 'ville.kinshasa@jeunesseparle.test',
                'phone' => '+243900000005',
                'role' => RoleSlug::ResponsableVille,
                'scope' => ['province_id' => $kinshasa?->id, 'city_id' => $kinshasaCity?->id],
            ],
            [
                'name' => 'Responsable Cellule Kintambo',
                'email' => 'kintambo@jeunesseparle.test',
                'phone' => '+243900000006',
                'role' => RoleSlug::ResponsableLocal,
                'scope' => [
                    'province_id' => $kinshasa?->id,
                    'city_id' => $kinshasaCity?->id,
                    'structure_id' => $celluleKintambo?->id,
                ],
            ],
            [
                'name' => 'Agent de Vérification',
                'email' => 'agent@jeunesseparle.test',
                'phone' => '+243900000007',
                'role' => RoleSlug::AgentVerification,
                'scope' => [],
            ],
        ];

        foreach ($accounts as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                array_merge([
                    'name' => $account['name'],
                    'phone' => $account['phone'],
                    'password' => $password,
                    'role_id' => $roles[$account['role']->value],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ], $account['scope']),
            );
        }

        $this->command?->info('Comptes de démonstration créés.');

        $this->seedMembers($cards, $roles, $password);
        $this->seedActivities($identifiers);
    }

    private function seedMembers(CardService $cards, $roles, string $password): void
    {
        if (Member::count() > 0) {
            $this->command?->info('Membres déjà présents : génération ignorée.');

            return;
        }

        $structures = Structure::with('province')->get();
        $admin = User::where('email', 'admin@jeunesseparle.test')->first();

        $statusPlan = array_merge(
            array_fill(0, 90, MemberStatus::Active),
            array_fill(0, 18, MemberStatus::Pending),
            array_fill(0, 8, MemberStatus::Inactive),
            array_fill(0, 3, MemberStatus::Suspended),
            array_fill(0, 1, MemberStatus::Archived),
        );

        shuffle($statusPlan);

        DB::transaction(function () use ($structures, $statusPlan, $admin) {
            foreach ($statusPlan as $status) {
                $structure = $structures->random();

                Member::factory()->create([
                    'status' => $status,
                    'structure_id' => $structure->id,
                    'province_id' => $structure->province_id,
                    'city_id' => $structure->city_id,
                    'commune_id' => $structure->commune_id,
                    'zone_id' => $structure->zone_id,
                    'registered_by' => $admin?->id,
                    'validated_at' => $status === MemberStatus::Active ? now()->subDays(random_int(1, 300)) : null,
                    'validated_by' => $status === MemberStatus::Active ? $admin?->id : null,
                    'created_at' => now()->subDays(random_int(1, 700)),
                ]);
            }
        });

        // Émission des cartes pour un sous-ensemble d'actifs, afin d'illustrer
        // les deux cas de figure (avec et sans carte).
        Member::where('status', MemberStatus::Active->value)
            ->inRandomOrder()
            ->limit(60)
            ->get()
            ->each(fn (Member $member) => $cards->issue($member, $admin, 'Émission de démonstration'));

        // Un membre de référence, doté d'un compte connecté à son dossier.
        $showcase = Member::where('status', MemberStatus::Active->value)
            ->whereHas('activeCard')
            ->first();

        if ($showcase) {
            $showcase->update([
                'last_name' => 'Mbongi',
                'middle_name' => 'Kabeya',
                'first_name' => 'Nathan',
                'email' => 'nathan@jeunesseparle.test',
                'position' => 'Secrétaire de cellule',
            ]);

            $user = User::updateOrCreate(
                ['email' => 'nathan@jeunesseparle.test'],
                [
                    'name' => 'Nathan Mbongi',
                    'phone' => $showcase->phone,
                    'password' => $password,
                    'role_id' => $roles[RoleSlug::Membre->value],
                    'province_id' => $showcase->province_id,
                    'city_id' => $showcase->city_id,
                    'structure_id' => $showcase->structure_id,
                    'member_id' => $showcase->id,
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );

            $showcase->update(['user_id' => $user->id]);
        }

        $this->command?->info(Member::count().' membres de démonstration créés.');
    }

    private function seedActivities(IdentifierGenerator $identifiers): void
    {
        if (Activity::count() > 0) {
            return;
        }

        $organizer = User::where('email', 'admin@jeunesseparle.test')->first();
        $structures = Structure::with('province')->get();

        $definitions = [
            ['Formation au numérique et à la citoyenneté', ActivityType::Formation, -20, ActivityStatus::Completed],
            ['Réunion mensuelle de coordination', ActivityType::Reunion, -7, ActivityStatus::Completed],
            ['Campagne de sensibilisation à la salubrité', ActivityType::Campagne, -3, ActivityStatus::Completed],
            ['Conférence sur l\'entrepreneuriat des jeunes', ActivityType::Conference, 10, ActivityStatus::Planned],
            ['Mission d\'identification des membres', ActivityType::Mission, 18, ActivityStatus::Planned],
            ['Journée communautaire de reboisement', ActivityType::Communautaire, 25, ActivityStatus::Planned],
        ];

        foreach ($definitions as [$title, $type, $dayOffset, $status]) {
            $structure = $structures->random();

            $activity = Activity::create([
                'code' => $identifiers->activityCode(),
                'title' => $title,
                'description' => 'Activité de démonstration générée automatiquement pour illustrer le module.',
                'type' => $type,
                'status' => $status,
                'starts_at' => now()->addDays($dayOffset)->setTime(9, 0),
                'ends_at' => now()->addDays($dayOffset)->setTime(14, 0),
                'location' => $structure->name,
                'province_id' => $structure->province_id,
                'city_id' => $structure->city_id,
                'commune_id' => $structure->commune_id,
                'structure_id' => $structure->id,
                'organizer_id' => $organizer?->id,
                'capacity' => 120,
                'is_public' => $status === ActivityStatus::Planned,
            ]);

            $participants = Member::where('structure_id', $structure->id)
                ->where('status', MemberStatus::Active->value)
                ->inRandomOrder()
                ->limit(12)
                ->get();

            $activity->members()->syncWithoutDetaching(
                $participants->mapWithKeys(fn (Member $m) => [
                    $m->id => ['status' => 'confirmed', 'invited_at' => now(), 'confirmed_at' => now()],
                ])->all(),
            );

            if ($status === ActivityStatus::Completed) {
                foreach ($participants as $index => $member) {
                    Attendance::updateOrCreate(
                        ['activity_id' => $activity->id, 'member_id' => $member->id],
                        [
                            'status' => $index % 5 === 0 ? AttendanceStatus::Absent : AttendanceStatus::Present,
                            'method' => $index % 3 === 0 ? 'manual' : 'qr',
                            'recorded_at' => $activity->starts_at,
                            'recorded_by' => $organizer?->id,
                        ],
                    );
                }
            }
        }

        $this->command?->info(Activity::count().' activités de démonstration créées.');
    }
}
