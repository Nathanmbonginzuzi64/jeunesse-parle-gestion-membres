<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('who_can_contact', 40)->default('authorized');
            $table->boolean('read_receipts')->default(true);
            $table->boolean('show_online')->default(true);
            $table->boolean('show_last_seen')->default(true);
            $table->string('photo_visibility', 20)->default('contacts');
            $table->string('phone_visibility', 20)->default('private');
            $table->string('email_visibility', 20)->default('private');
            $table->string('theme', 20)->default('system');
            $table->string('locale', 10)->default('fr');
            $table->boolean('reduce_motion')->default(false);
            $table->boolean('auto_download_media')->default(true);
            $table->boolean('wifi_only_downloads')->default(false);
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
    }
};
