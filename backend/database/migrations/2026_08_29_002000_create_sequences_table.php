<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Compteurs atomiques utilisés pour produire les identifiants métier
 * (JP-RDC-00000001, JP-ACT-000001, ...) sans dépendre de MAX() sur des tables
 * volumineuses ni risquer les collisions en écriture concurrente.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sequences', function (Blueprint $table) {
            $table->id();
            $table->string('key', 60)->unique();
            $table->unsignedBigInteger('value')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sequences');
    }
};
