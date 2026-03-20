<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('sandboxes', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('git_branch');
            $table->enum('stack_type', ['full', 'api', 'mysql']);
            $table->string('machine_ip');
            $table->enum('status', ['running', 'stopped', 'failed', 'deploying'])->default('stopped');
            $table->string('version')->nullable();
            $table->timestamp('last_deployed')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('sandboxes');
    }
};
