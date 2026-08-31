<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->foreignId('zone_id')->nullable()->after('commune_id')->constrained('zones')->nullOnDelete();
            $table->foreignId('avenue_id')->nullable()->after('zone_id')->constrained('avenues')->nullOnDelete();
            $table->decimal('latitude', 10, 7)->nullable()->after('location');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->boolean('live_location_active')->default(false)->after('longitude');
            $table->decimal('live_latitude', 10, 7)->nullable()->after('live_location_active');
            $table->decimal('live_longitude', 10, 7)->nullable()->after('live_latitude');
            $table->timestamp('live_updated_at')->nullable()->after('live_longitude');
            $table->foreignId('live_shared_by')->nullable()->after('live_updated_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropConstrainedForeignId('live_shared_by');
            $table->dropColumn([
                'live_updated_at', 'live_longitude', 'live_latitude', 'live_location_active',
                'longitude', 'latitude', 'avenue_id', 'zone_id',
            ]);
        });
    }
};
