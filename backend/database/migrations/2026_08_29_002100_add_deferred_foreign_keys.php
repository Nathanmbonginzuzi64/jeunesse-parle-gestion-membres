<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contraintes croisées posées après coup : ces colonnes référencent des tables
 * créées plus tard dans la chaîne de migrations (dépendances circulaires).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            // SQLite ne sait pas ajouter une contrainte à une table existante ;
            // l'intégrité de ces colonnes est assurée applicativement.
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreign('member_id')->references('id')->on('members')->nullOnDelete();
        });

        Schema::table('structures', function (Blueprint $table) {
            $table->foreign('leader_member_id')->references('id')->on('members')->nullOnDelete();
        });

        Schema::table('members', function (Blueprint $table) {
            $table->foreign('supervisor_member_id')->references('id')->on('members')->nullOnDelete();
        });

        Schema::table('member_cards', function (Blueprint $table) {
            $table->foreign('replaced_by_card_id')->references('id')->on('member_cards')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('users', fn (Blueprint $table) => $table->dropForeign(['member_id']));
        Schema::table('structures', fn (Blueprint $table) => $table->dropForeign(['leader_member_id']));
        Schema::table('members', fn (Blueprint $table) => $table->dropForeign(['supervisor_member_id']));
        Schema::table('member_cards', fn (Blueprint $table) => $table->dropForeign(['replaced_by_card_id']));
    }
};
