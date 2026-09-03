<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('biometric_templates', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->dropUnique('biometric_member_modality_unique');
        });

        // Nullable pour permettre les templates liés à un user staff (compatible MySQL + SQLite).
        Schema::table('biometric_templates', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable()->change();
        });

        Schema::table('biometric_templates', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('member_id')->constrained()->cascadeOnDelete();
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
            $table->unique(['member_id', 'modality', 'position'], 'biometric_member_modality_unique');
            $table->unique(['user_id', 'modality', 'position'], 'biometric_user_modality_unique');
        });
    }

    public function down(): void
    {
        Schema::table('biometric_templates', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique('biometric_user_modality_unique');
            $table->dropUnique('biometric_member_modality_unique');
            $table->dropColumn('user_id');
            $table->dropForeign(['member_id']);
        });

        Schema::table('biometric_templates', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable(false)->change();
        });

        Schema::table('biometric_templates', function (Blueprint $table) {
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
            $table->unique(['member_id', 'modality', 'position'], 'biometric_member_modality_unique');
        });
    }
};
