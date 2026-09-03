<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('portal', 20)->nullable()->after('user_agent');
            $table->string('request_path', 180)->nullable()->after('portal');
            $table->index(['portal', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['portal', 'created_at']);
            $table->dropColumn(['portal', 'request_path']);
        });
    }
};
