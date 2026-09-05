<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_posts', function (Blueprint $table) {
            $table->string('source_key', 80)->nullable()->unique()->after('author_id');
        });
    }

    public function down(): void
    {
        Schema::table('home_posts', function (Blueprint $table) {
            $table->dropUnique(['source_key']);
            $table->dropColumn('source_key');
        });
    }
};
