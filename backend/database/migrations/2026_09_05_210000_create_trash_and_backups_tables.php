<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trash_items', function (Blueprint $table) {
            $table->id();
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->string('module', 60)->index();
            $table->string('label');
            $table->json('payload')->nullable();
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('deleted_by_name')->nullable();
            $table->timestamp('restored_at')->nullable();
            $table->foreignId('restored_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('purged_at')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
            $table->index(['deleted_by', 'restored_at', 'purged_at']);
        });

        Schema::create('system_backups', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('filename');
            $table->string('disk_path');
            $table->string('format', 20)->default('json');
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('checksum', 64)->nullable();
            $table->string('status', 20)->default('ready');
            $table->unsignedInteger('tables_count')->default(0);
            $table->unsignedInteger('rows_count')->default(0);
            $table->text('notes')->nullable();
            $table->json('meta')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_backups');
        Schema::dropIfExists('trash_items');
    }
};
