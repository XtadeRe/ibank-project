<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('health_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sandbox_id')->constrained()->onDelete('cascade');
            $table->boolean('is_available');
            $table->integer('response_time')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('health_checks');
    }
};
