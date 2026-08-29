<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Enums\MemberStatus;
use App\Models\Member;
use App\Models\Province;
use App\Services\IdentifierGenerator;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    protected $model = Member::class;

    private const LAST_NAMES = [
        'Mbongi', 'Kabila', 'Tshimanga', 'Mukendi', 'Ilunga', 'Kasongo', 'Mwamba',
        'Ngoy', 'Lukusa', 'Bemba', 'Mputu', 'Katembo', 'Bahati', 'Ndala', 'Kalonji',
        'Mulumba', 'Tshibangu', 'Kanyinda', 'Muteba', 'Nzuzi',
    ];

    private const MIDDLE_NAMES = [
        'Kabeya', 'Nsimba', 'Mwenze', 'Lumbala', 'Tshiala', 'Kembo', 'Mavinga',
        'Kabuya', 'Nkulu', 'Bope', 'Kalala', 'Musambi',
    ];

    private const MALE_FIRST_NAMES = [
        'Nathan', 'Patrick', 'David', 'Jonathan', 'Emmanuel', 'Christian', 'Trésor',
        'Merveille', 'Gédéon', 'Josué', 'Bénédict', 'Fiston', 'Espoir', 'Dieudonné',
    ];

    private const FEMALE_FIRST_NAMES = [
        'Grâce', 'Esther', 'Deborah', 'Sarah', 'Nadine', 'Chantal', 'Bénédicte',
        'Divine', 'Rachel', 'Prisca', 'Gloria', 'Naomi', 'Fabiola', 'Josiane',
    ];

    private const PROFESSIONS = [
        'Étudiant', 'Enseignant', 'Développeur', 'Infirmier', 'Commerçant', 'Agriculteur',
        'Mécanicien', 'Comptable', 'Journaliste', 'Couturier', 'Électricien', 'Juriste',
        'Agent de santé', 'Animateur communautaire', 'Technicien', 'Entrepreneur',
    ];

    private const SKILLS = [
        'informatique', 'communication', 'leadership', 'agriculture', 'couture',
        'menuiserie', 'photographie', 'mobilisation communautaire', 'comptabilité',
        'anglais', 'gestion de projet', 'secourisme', 'maçonnerie', 'électricité',
    ];

    private const INTERESTS = [
        'éducation', 'entrepreneuriat', 'environnement', 'sport', 'musique', 'santé',
        'gouvernance', 'droits humains', 'technologie', 'culture',
    ];

    private const EDUCATION_LEVELS = [
        'Secondaire', 'Diplômé d\'État', 'Graduat', 'Licence', 'Formation professionnelle',
    ];

    private const EMPLOYMENT_STATUSES = [
        'Étudiant', 'Sans emploi', 'Employé', 'Indépendant', 'Entrepreneur', 'Bénévole',
    ];

    public function definition(): array
    {
        $gender = fake()->randomElement([Gender::Male, Gender::Female]);

        $firstName = $gender === Gender::Male
            ? fake()->randomElement(self::MALE_FIRST_NAMES)
            : fake()->randomElement(self::FEMALE_FIRST_NAMES);

        $province = Province::inRandomOrder()->first() ?? Province::factory()->create();

        return [
            'member_code' => app(IdentifierGenerator::class)->memberCode(),
            'last_name' => fake()->randomElement(self::LAST_NAMES),
            'middle_name' => fake()->randomElement(self::MIDDLE_NAMES),
            'first_name' => $firstName,
            'gender' => $gender,
            'birth_date' => fake()->dateTimeBetween('-38 years', '-16 years')->format('Y-m-d'),
            'birth_place' => $province->chief_town,
            'phone' => '+243'.fake()->numberBetween(800000000, 999999999),
            'email' => null,
            'address' => fake()->streetAddress(),
            'province_id' => $province->id,
            'education_level' => fake()->randomElement(self::EDUCATION_LEVELS),
            'profession' => fake()->randomElement(self::PROFESSIONS),
            'employment_status' => fake()->randomElement(self::EMPLOYMENT_STATUSES),
            'skills' => fake()->randomElements(self::SKILLS, fake()->numberBetween(1, 4)),
            'interests' => fake()->randomElements(self::INTERESTS, fake()->numberBetween(1, 3)),
            'joined_at' => fake()->dateTimeBetween('-3 years', 'now')->format('Y-m-d'),
            'status' => MemberStatus::Active,
            'status_changed_at' => now(),
            'consent_given' => true,
            'consent_given_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'status' => MemberStatus::Pending,
            'validated_at' => null,
        ]);
    }

    public function withStatus(MemberStatus $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }
}
