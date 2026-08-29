<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->unique()->after('email');
            $table->foreignId('role_id')->nullable()->after('phone')->constrained()->nullOnDelete();

            // Périmètre territorial du compte : borne toutes les requêtes de l'utilisateur.
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('commune_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('structure_id')->nullable()->constrained()->nullOnDelete();

            $table->unsignedBigInteger('member_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('must_change_password')->default(false);
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->unsignedSmallInteger('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            $table->string('two_factor_secret')->nullable();
            $table->timestamp('two_factor_confirmed_at')->nullable();
            $table->softDeletes();

            $table->index('role_id');
            $table->index('member_id');
            $table->index(['province_id', 'city_id', 'commune_id', 'structure_id'], 'users_scope_index');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'role_id', 'province_id', 'city_id', 'commune_id', 'structure_id',
                'member_id', 'is_active', 'must_change_password', 'last_login_at', 'last_login_ip',
                'failed_login_attempts', 'locked_until', 'two_factor_secret', 'two_factor_confirmed_at',
                'deleted_at',
            ]);
        });
    }
};
