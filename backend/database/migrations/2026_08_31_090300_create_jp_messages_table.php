<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jp_messages', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('subject', 200);
            $table->string('category', 40); // plainte|suggestion|doleanace|demande|preoccupation
            $table->text('body');
            $table->string('attachment_path')->nullable();
            $table->string('status', 20)->default('open'); // open|in_progress|resolved|closed
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('read_by_admin_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'created_at']);
        });

        Schema::create('jp_message_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jp_message_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->string('attachment_path')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jp_message_replies');
        Schema::dropIfExists('jp_messages');
    }
};
