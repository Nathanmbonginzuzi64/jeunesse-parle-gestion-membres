<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jp_messages', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
        });

        Schema::table('jp_messages', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable()->change();
            $table->string('guest_name', 120)->nullable()->after('member_id');
            $table->string('guest_email', 190)->nullable()->after('guest_name');
            $table->string('source', 20)->default('member')->after('guest_email');
            $table->foreign('member_id')->references('id')->on('members')->nullOnDelete();
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::table('jp_messages', function (Blueprint $table) {
            $table->dropForeign(['member_id']);
            $table->dropIndex(['source']);
            $table->dropColumn(['guest_name', 'guest_email', 'source']);
        });

        Schema::table('jp_messages', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
        });
    }
};
