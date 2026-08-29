<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_card_id')->constrained()->cascadeOnDelete();
            // Jeton opaque : ne contient aucune donnée personnelle, sert uniquement de clé de vérification.
            $table->string('token', 64)->unique();
            $table->string('status', 20)->default('active'); // active|revoked|expired
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->string('revoked_reason', 255)->nullable();
            $table->timestamp('last_scanned_at')->nullable();
            $table->unsignedInteger('scan_count')->default(0);
            $table->timestamps();

            $table->index(['member_card_id', 'status']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_tokens');
    }
};
