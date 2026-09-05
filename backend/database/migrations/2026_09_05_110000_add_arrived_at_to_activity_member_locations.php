<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activity_member_locations', function (Blueprint $table) {
            $table->timestamp('arrived_at')->nullable()->after('sharing_active');
            $table->index(['activity_id', 'arrived_at']);
        });
    }

    public function down(): void
    {
        Schema::table('activity_member_locations', function (Blueprint $table) {
            $table->dropIndex(['activity_id', 'arrived_at']);
            $table->dropColumn('arrived_at');
        });
    }
};
