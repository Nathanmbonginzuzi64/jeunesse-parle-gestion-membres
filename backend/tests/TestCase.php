<?php

namespace Tests;

use App\Enums\RoleSlug;
use App\Models\City;
use App\Models\Commune;
use App\Models\Province;
use App\Models\Role;
use App\Models\Structure;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function seedRoles(): void
    {
        $this->seed(RolePermissionSeeder::class);
    }

    protected function makeProvince(string $code, string $name): Province
    {
        return Province::create([
            'code' => $code,
            'name' => $name,
            'chief_town' => $name,
            'is_active' => true,
        ]);
    }

    protected function makeCity(Province $province, string $name): City
    {
        return City::create([
            'province_id' => $province->id,
            'name' => $name,
            'type' => 'ville',
            'is_active' => true,
        ]);
    }

    protected function makeCommune(City $city, string $name): Commune
    {
        return Commune::create([
            'city_id' => $city->id,
            'province_id' => $city->province_id,
            'name' => $name,
            'type' => 'commune',
            'is_active' => true,
        ]);
    }

    protected function makeStructure(Province $province, ?City $city = null, string $name = 'Cellule Test'): Structure
    {
        return Structure::create([
            'code' => 'JP-STR-'.str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'name' => $name,
            'type' => 'cellule',
            'province_id' => $province->id,
            'city_id' => $city?->id,
            'is_active' => true,
        ]);
    }

    protected function makeUser(RoleSlug $roleSlug, array $attributes = []): User
    {
        $role = Role::where('slug', $roleSlug->value)->firstOrFail();

        return User::create(array_merge([
            'name' => 'Utilisateur '.$roleSlug->value,
            'email' => $roleSlug->value.'-'.uniqid().'@test.local',
            'password' => 'MotDePasse!2026',
            'role_id' => $role->id,
            'is_active' => true,
        ], $attributes));
    }
}
