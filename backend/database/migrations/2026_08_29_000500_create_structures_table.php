<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('structures', function (Blueprint $table) {
            $table->id();
            $table->string('code', 40)->unique();
            $table->string('name', 160);
            $table->string('type', 30)->default('cellule'); // coordination_nationale | coordination_provinciale | antenne | cellule | club
            $table->text('description')->nullable();

            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('commune_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();

            $table->string('address', 255)->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('contact_email', 160)->nullable();
            $table->unsignedBigInteger('leader_member_id')->nullable();
            $table->date('created_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['province_id', 'city_id', 'commune_id', 'zone_id'], 'structures_territory_index');
            $table->index('name');
            $table->index('leader_member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('structures');
    }
};
