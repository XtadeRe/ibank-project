<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class AutoCheckController extends Controller
{
    public function enable()
    {
        Cache::put('auto_check_enabled', true, 86400); // 24 часа
        return response()->json(['success' => true, 'enabled' => true]);
    }

    public function disable()
    {
        Cache::put('auto_check_enabled', false, 86400);
        return response()->json(['success' => true, 'enabled' => false]);
    }

    public function status()
    {
        $enabled = Cache::get('auto_check_enabled', false);

        // Получаем последний запуск из логов или кэша
        $lastRun = Cache::get('auto_check_last_run');

        // Рассчитываем следующее время (каждые 30 минут)
        $nextRun = null;
        if ($enabled && $lastRun) {
            $nextRun = \Carbon\Carbon::parse($lastRun)->addMinutes(30);
        }

        return response()->json([
            'enabled' => $enabled,
            'last_run' => $lastRun,
            'next_run' => $nextRun
        ]);
    }
}
