<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('news_reactions', 'user_id')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('member_id')->constrained()->cascadeOnDelete();
            });
        }

        DB::statement('
            UPDATE news_reactions nr
            INNER JOIN members m ON m.id = nr.member_id
            SET nr.user_id = m.user_id
            WHERE nr.user_id IS NULL
        ');

        if (! $this->indexExists('news_reactions', 'news_reactions_news_post_id_index')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->index('news_post_id', 'news_reactions_news_post_id_index');
            });
        }

        if ($this->constraintExists('news_reactions_news_post_id_member_id_unique')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->dropUnique(['news_post_id', 'member_id']);
            });
        }

        if ($this->foreignKeyExists('news_reactions', 'member_id')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->dropForeign(['member_id']);
            });
        }

        Schema::table('news_reactions', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable()->change();
        });

        if (! $this->foreignKeyExists('news_reactions', 'member_id')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->foreign('member_id')->references('id')->on('members')->nullOnDelete();
            });
        }

        if (! $this->constraintExists('news_reactions_news_post_id_user_id_unique')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->unique(['news_post_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('news_reactions', function (Blueprint $table) {
            if ($this->constraintExists('news_reactions_news_post_id_user_id_unique')) {
                $table->dropUnique(['news_post_id', 'user_id']);
            }
            if ($this->foreignKeyExists('news_reactions', 'member_id')) {
                $table->dropForeign(['member_id']);
            }
            if ($this->foreignKeyExists('news_reactions', 'user_id')) {
                $table->dropForeign(['user_id']);
            }
        });

        if (Schema::hasColumn('news_reactions', 'user_id')) {
            Schema::table('news_reactions', function (Blueprint $table) {
                $table->dropColumn('user_id');
            });
        }

        Schema::table('news_reactions', function (Blueprint $table) {
            $table->unsignedBigInteger('member_id')->nullable(false)->change();
            $table->foreign('member_id')->references('id')->on('members')->cascadeOnDelete();
            $table->unique(['news_post_id', 'member_id']);
        });
    }

    private function constraintExists(string $name): bool
    {
        $rows = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?',
            ['news_reactions', $name],
        );

        return count($rows) > 0;
    }

    private function foreignKeyExists(string $table, string $column): bool
    {
        $rows = DB::select(
            'SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL',
            [$table, $column],
        );

        return count($rows) > 0;
    }

    private function indexExists(string $table, string $name): bool
    {
        $rows = DB::select('SHOW INDEX FROM '.$table.' WHERE Key_name = ?', [$name]);

        return count($rows) > 0;
    }
};
