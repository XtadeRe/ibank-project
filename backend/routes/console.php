<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;
use App\Console\Commands\AutoHealthCheck;
// Запуск каждые 30 минут (автопроверка)
Schedule::command('stacks:auto-check')
    ->everyThirtyMinutes()
    ->when(function () {
        return Cache::get('auto_check_enabled', false);
    });
