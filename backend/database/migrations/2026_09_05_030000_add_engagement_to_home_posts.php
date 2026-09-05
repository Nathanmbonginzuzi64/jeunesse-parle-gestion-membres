<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_posts', function (Blueprint $table) {
            $table->unsignedInteger('views_count')->default(0)->after('sort_order');
            $table->unsignedInteger('likes_count')->default(0)->after('views_count');
            $table->unsignedInteger('comments_count')->default(0)->after('likes_count');
        });

        Schema::create('home_post_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('home_post_id')->constrained('home_posts')->cascadeOnDelete();
            $table->string('visitor_key', 64);
            $table->string('ip_address', 45)->nullable();
            $table->date('viewed_on');
            $table->timestamp('viewed_at');
            $table->unique(['home_post_id', 'visitor_key', 'viewed_on']);
            $table->index(['home_post_id', 'viewed_at']);
        });

        Schema::create('home_post_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('home_post_id')->constrained('home_posts')->cascadeOnDelete();
            $table->string('visitor_key', 64);
            $table->timestamps();
            $table->unique(['home_post_id', 'visitor_key']);
        });

        Schema::create('home_post_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('home_post_id')->constrained('home_posts')->cascadeOnDelete();
            $table->string('author_name', 80);
            $table->string('author_email', 160)->nullable();
            $table->text('body');
            $table->boolean('is_approved')->default(true);
            $table->string('visitor_key', 64)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->index(['home_post_id', 'is_approved']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_post_comments');
        Schema::dropIfExists('home_post_likes');
        Schema::dropIfExists('home_post_views');

        Schema::table('home_posts', function (Blueprint $table) {
            $table->dropColumn(['views_count', 'likes_count', 'comments_count']);
        });
    }
};
