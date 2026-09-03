<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jp_chat_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('type', 20)->default('direct'); // direct|group|structure|activity
            $table->string('pair_key', 32)->nullable()->unique();
            $table->string('subject', 160)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('structure_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('activity_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('last_message_at')->nullable();
            $table->string('last_message_preview', 180)->nullable();
            $table->timestamps();

            $table->index(['type', 'last_message_at']);
        });

        Schema::create('jp_chat_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('jp_chat_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20)->default('member');
            $table->timestamp('last_read_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->unique(['conversation_id', 'user_id']);
            $table->index(['user_id', 'last_read_at']);
        });

        Schema::create('jp_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('jp_chat_conversations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20)->default('text'); // text|image|file|audio
            $table->text('body')->nullable();
            $table->foreignId('reply_to_id')->nullable()->constrained('jp_chat_messages')->nullOnDelete();
            $table->timestamp('edited_at')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
        });

        Schema::create('jp_chat_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('jp_chat_messages')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name', 180);
            $table->string('mime', 80);
            $table->unsignedInteger('size');
            $table->string('kind', 20); // image|file|audio
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jp_chat_attachments');
        Schema::dropIfExists('jp_chat_messages');
        Schema::dropIfExists('jp_chat_participants');
        Schema::dropIfExists('jp_chat_conversations');
    }
};
