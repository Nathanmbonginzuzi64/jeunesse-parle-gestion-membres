<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('members', function (Blueprint $table) {
            $table->id();
            $table->string('member_code', 20)->unique(); // JP-RDC-00000001
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // Identité
            $table->string('photo_path')->nullable();
            $table->string('last_name', 80);       // nom
            $table->string('middle_name', 80)->nullable(); // postnom
            $table->string('first_name', 80);      // prénom
            $table->char('gender', 1);             // M | F
            $table->date('birth_date')->nullable();
            $table->string('birth_place', 120)->nullable();

            // Contact
            $table->string('phone', 30);
            $table->string('phone_alt', 30)->nullable();
            $table->string('email', 160)->nullable();
            $table->string('address', 255)->nullable();

            // Localisation
            $table->foreignId('province_id')->constrained()->restrictOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('commune_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('structure_id')->nullable()->constrained()->nullOnDelete();

            // Profil socio-professionnel
            $table->string('education_level', 60)->nullable();
            $table->string('profession', 120)->nullable();
            $table->string('employment_status', 60)->nullable();
            $table->string('activity_domain', 120)->nullable();
            $table->json('skills')->nullable();
            $table->json('interests')->nullable();

            // Appartenance
            $table->string('position', 120)->nullable(); // fonction dans la structure
            $table->unsignedBigInteger('supervisor_member_id')->nullable();
            $table->date('joined_at')->nullable();

            // Statut du dossier
            $table->string('status', 20)->default('pending'); // pending|active|inactive|suspended|archived
            $table->string('status_reason', 255)->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();

            $table->boolean('consent_given')->default(false);
            $table->timestamp('consent_given_at')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('phone');
            $table->index('email');
            $table->index(['last_name', 'first_name']);
            $table->index(['province_id', 'city_id', 'commune_id', 'structure_id'], 'members_territory_index');
            $table->index(['status', 'province_id']);
            $table->index('created_at');
            $table->index('supervisor_member_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('members');
    }
};
