<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            TerritorySeeder::class,
            StructureSeeder::class,
            SettingsSeeder::class,
            DemoDataSeeder::class,
        ]);
    }
}
