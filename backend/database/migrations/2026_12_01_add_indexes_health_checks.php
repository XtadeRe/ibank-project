<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('health_checks', function (Blueprint $table) {
            $table->index(['sandbox_id', 'created_at']);
            $table->index('is_available');
        });
    }

    public function down()
    {
        Schema::table('health_checks', function (Blueprint $table) {
            $table->dropIndex(['sandbox_id', 'created_at']);
            $table->dropIndex('is_available');
        });
    }
};

