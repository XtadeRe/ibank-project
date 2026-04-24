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
        Schema::table('sandboxes', function (Blueprint $table) {
            $table->index('name');
        });

        Schema::table('history', function (Blueprint $table) {
            $table->index(['sandbox_id', 'created_at']);
        });

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

