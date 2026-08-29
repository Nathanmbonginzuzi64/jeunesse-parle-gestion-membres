<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('type', 60); // account_validated | card_issued | activity_invitation | ...
            $table->string('title', 180);
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            // Canaux prévus pour une diffusion future (push, email, sms) ; « database » est le seul actif.
            $table->string('channel', 20)->default('database');
            $table->string('level', 20)->default('info'); // info|success|warning|danger
            $table->timestamp('read_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'read_at']);
            $table->index(['member_id', 'created_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
