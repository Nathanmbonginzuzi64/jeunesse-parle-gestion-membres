<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->string('code', 24)->unique(); // JP-ACT-000001
            $table->string('title', 180);
            $table->text('description')->nullable();
            $table->string('type', 30)->default('reunion'); // reunion|formation|conference|campagne|evenement|mission|communautaire
            $table->dateTime('starts_at');
            $table->dateTime('ends_at')->nullable();
            $table->string('location', 255)->nullable();

            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('commune_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('structure_id')->nullable()->constrained()->nullOnDelete();

            $table->foreignId('organizer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('planned'); // planned|ongoing|completed|cancelled
            $table->unsignedInteger('capacity')->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'starts_at']);
            $table->index(['province_id', 'starts_at']);
            $table->index('structure_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
