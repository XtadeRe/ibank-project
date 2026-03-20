<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sandbox_id')->constrained()->onDelete('cascade');
            $table->string('type'); // 'container_down', 'health_check_failed'
            $table->string('severity'); // (Тяжесть ошибки) 'low', 'medium', 'high', 'critical'
            $table->text('message');
            $table->json('actions_taken')->nullable();
            $table->boolean('resolved')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('incidents');
    }
};
