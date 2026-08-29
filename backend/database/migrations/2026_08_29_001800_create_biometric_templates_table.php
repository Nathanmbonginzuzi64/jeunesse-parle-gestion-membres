<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table d'abstraction pour une future identification biométrique.
 *
 * Aucune image brute d'empreinte n'est stockée : seule une référence opaque vers
 * un coffre externe certifié (`template_reference`) et des métadonnées de qualité
 * sont conservées. L'activation réelle est conditionnée au consentement explicite
 * du membre et à la validation du cadre légal applicable en RDC.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('biometric_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('modality', 30)->default('fingerprint'); // fingerprint|face|iris
            $table->string('position', 30)->nullable();             // right_thumb, left_index, ...
            $table->string('provider', 60)->nullable();
            $table->string('algorithm', 60)->nullable();
            $table->string('template_reference', 191)->nullable();  // identifiant dans le coffre externe
            $table->unsignedTinyInteger('quality_score')->nullable();
            $table->string('status', 20)->default('pending');       // pending|enrolled|revoked
            $table->timestamp('captured_at')->nullable();
            $table->timestamp('consent_given_at')->nullable();
            $table->string('consent_reference', 120)->nullable();
            $table->foreignId('enrolled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['member_id', 'modality', 'position'], 'biometric_member_modality_unique');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biometric_templates');
    }
};
