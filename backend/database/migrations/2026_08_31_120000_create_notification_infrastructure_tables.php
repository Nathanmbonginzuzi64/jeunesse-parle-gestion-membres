<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('activity')->default(true);
            $table->boolean('news')->default(true);
            $table->boolean('message')->default(true);
            $table->boolean('presence')->default(true);
            $table->boolean('security')->default(true);
            $table->boolean('promotion')->default(true);
            $table->boolean('reminder')->default(true);
            $table->boolean('push_enabled')->default(true);
            $table->boolean('email_enabled')->default(false);
            $table->timestamps();
        });

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->nullable()->constrained('app_notifications')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 60);
            $table->string('channel', 20)->default('database');
            $table->string('status', 20)->default('sent'); // sent|delivered|failed|skipped
            $table->string('recipient_label')->nullable();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('error')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['type', 'status']);
        });

        Schema::create('device_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('token', 512);
            $table->string('platform', 20); // android|ios|web
            $table->string('device_name')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'token']);
            $table->index(['platform', 'last_used_at']);
        });

        Schema::table('app_notifications', function (Blueprint $table) {
            $table->string('category', 30)->nullable()->after('type');
            $table->foreignId('author_id')->nullable()->after('member_id')->constrained('users')->nullOnDelete();
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::table('app_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('author_id');
            $table->dropIndex(['category']);
            $table->dropColumn('category');
        });

        Schema::dropIfExists('device_tokens');
        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('notification_preferences');
    }
};
