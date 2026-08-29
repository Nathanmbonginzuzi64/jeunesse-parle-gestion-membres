<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained()->cascadeOnDelete();
            $table->foreignId('province_id')->constrained()->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('type', 20)->default('commune'); // commune | secteur | chefferie
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['city_id', 'name']);
            $table->index('name');
            $table->index('province_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communes');
    }
};
