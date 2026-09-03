<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('news_comments', function (Blueprint $table) {
            $table->unsignedInteger('likes_count')->default(0)->after('body');
        });

        Schema::create('news_comment_likes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('news_comment_id')->constrained('news_comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['news_comment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('news_comment_likes');

        Schema::table('news_comments', function (Blueprint $table) {
            $table->dropColumn('likes_count');
        });
    }
};
