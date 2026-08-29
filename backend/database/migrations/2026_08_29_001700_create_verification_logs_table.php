<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_card_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('qr_token_id')->nullable()->constrained()->nullOnDelete();
            // Seuls les 8 premiers caractères du jeton présenté sont conservés (traçabilité sans réutilisation).
            $table->string('token_fingerprint', 16)->nullable();
            $table->string('result', 20); // valid|revoked|expired|inactive|not_found
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('context', 30)->default('public'); // public|agent|attendance
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamps();

            $table->index(['member_id', 'created_at']);
            $table->index('result');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_logs');
    }
};
