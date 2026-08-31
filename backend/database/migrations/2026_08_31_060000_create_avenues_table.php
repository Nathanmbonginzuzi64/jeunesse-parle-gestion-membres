<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('avenues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained()->cascadeOnDelete();
            $table->foreignId('commune_id')->constrained()->cascadeOnDelete();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('number', 30)->nullable();
            $table->string('direction', 30)->nullable();
            $table->string('reference_stop', 160)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('zone_id');
            $table->index('name');
            $table->index('province_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avenues');
    }
};
