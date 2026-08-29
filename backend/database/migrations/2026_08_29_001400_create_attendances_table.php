<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained()->cascadeOnDelete();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20)->default('present'); // present|absent|late|excused
            $table->string('method', 20)->default('manual');  // qr|manual
            $table->timestamp('recorded_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->unique(['activity_id', 'member_id']);
            $table->index(['member_id', 'recorded_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
