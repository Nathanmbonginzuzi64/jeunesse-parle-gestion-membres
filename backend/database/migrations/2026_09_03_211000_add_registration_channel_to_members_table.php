<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->string('registration_channel', 20)->nullable()->after('registered_by');
            $table->index(['status', 'registration_channel']);
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropIndex(['status', 'registration_channel']);
            $table->dropColumn('registration_channel');
        });
    }
};
