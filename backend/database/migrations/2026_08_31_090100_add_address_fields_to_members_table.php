<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->foreignId('avenue_id')->nullable()->after('zone_id')->constrained('avenues')->nullOnDelete();
            $table->string('house_number', 40)->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('members', function (Blueprint $table) {
            $table->dropConstrainedForeignId('avenue_id');
            $table->dropColumn('house_number');
        });
    }
};
