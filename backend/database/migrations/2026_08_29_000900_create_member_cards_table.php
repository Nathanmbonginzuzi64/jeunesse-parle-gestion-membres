<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('member_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')->constrained()->cascadeOnDelete();
            $table->string('card_number', 30)->unique(); // JP-RDC-00000001-C01
            $table->unsignedSmallInteger('sequence')->default(1);
            $table->string('status', 20)->default('active'); // active|inactive|suspended|expired|lost|replaced
            $table->string('status_reason', 255)->nullable();
            $table->date('issued_at');
            $table->date('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->unsignedBigInteger('replaced_by_card_id')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('template_version', 20)->default('v1');
            $table->timestamps();

            $table->index(['member_id', 'status']);
            $table->unique(['member_id', 'sequence']);
            $table->index('replaced_by_card_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('member_cards');
    }
};
