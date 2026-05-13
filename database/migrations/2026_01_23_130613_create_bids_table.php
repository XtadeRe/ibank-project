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
        Schema::create('bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained();
            $table->foreignId('institution_id')->constrained();
            $table->string('name');
            $table->string('phone');
            $table->string('tg_username');
            $table->string('buy_method');
            $table->string('status')->default('pending');
            $table->string('institution_status')->nullable();
            $table->boolean('instruction')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bid');
    }
};
