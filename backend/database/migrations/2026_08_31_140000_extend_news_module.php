<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_posts', function (Blueprint $table) {
            $table->string('category', 30)->default('general')->after('body');
            $table->json('gallery_paths')->nullable()->after('media_path');
            $table->index('category');
        });

        Schema::create('news_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('viewed_at');
            $table->timestamps();

            $table->index(['news_post_id', 'viewed_at']);
            $table->index(['user_id', 'news_post_id']);
        });

        Schema::create('news_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('channel', 30)->default('in_app');
            $table->timestamps();

            $table->index(['news_post_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('news_shares');
        Schema::dropIfExists('news_views');
        Schema::table('news_posts', function (Blueprint $table) {
            $table->dropIndex(['category']);
            $table->dropColumn(['category', 'gallery_paths']);
        });
    }
};
