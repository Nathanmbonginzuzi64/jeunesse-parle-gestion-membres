<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Posts d'actualité de la page d'accueil publique.
 * Distinct du module membres `news_posts` (/actualites).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('home_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title', 180);
            $table->string('excerpt', 400)->nullable();
            $table->text('body')->nullable();
            $table->string('category', 60)->nullable();
            $table->string('image_path')->nullable();
            $table->string('external_url', 500)->nullable();
            $table->boolean('is_published')->default(false)->index();
            $table->timestamp('published_at')->nullable()->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('home_posts');
    }
};
