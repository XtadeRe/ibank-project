<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Индекс для быстрого поиска sandbox по имени
        Schema::table('sandboxes', function (Blueprint $table) {
            $table->index('name');
        });

        // Композитный индекс для history (часто используется сортировка по created_at)
        Schema::table('history', function (Blueprint $table) {
            $table->index(['sandbox_id', 'created_at']);
        });

        // Индекс для status в sandboxes (фильтрация running)
        Schema::table('sandboxes', function (Blueprint $table) {
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sandboxes', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['status']);
        });

        Schema::table('history', function (Blueprint $table) {
            $table->dropIndex(['sandbox_id', 'created_at']);
        });
    }
};

