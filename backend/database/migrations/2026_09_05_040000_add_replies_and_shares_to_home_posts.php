<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_posts', function (Blueprint $table) {
            $table->unsignedInteger('shares_count')->default(0)->after('comments_count');
        });

        Schema::table('home_post_comments', function (Blueprint $table) {
            $table->foreignId('parent_id')
                ->nullable()
                ->after('home_post_id')
                ->constrained('home_post_comments')
                ->cascadeOnDelete();
            $table->index(['home_post_id', 'parent_id', 'is_approved']);
        });

        Schema::create('home_post_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('home_post_id')->constrained('home_posts')->cascadeOnDelete();
            $table->string('visitor_key', 64)->nullable();
            $table->string('channel', 40)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->index(['home_post_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_post_shares');

        Schema::table('home_post_comments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });

        Schema::table('home_posts', function (Blueprint $table) {
            $table->dropColumn('shares_count');
        });
    }
};
