<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Permet d'enregistrer un credential WebAuthn pour un membre sans compte utilisateur
 * (création par un responsable) ou avant liaison user ↔ membre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webauthn_credentials', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('webauthn_credentials', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('webauthn_credentials', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('webauthn_credentials', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
