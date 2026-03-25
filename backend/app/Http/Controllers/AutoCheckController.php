<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

class AutoCheckController extends Controller
{
    public function enable()
    {
        try {
            Cache::put('auto_check_enabled', true, 86400); // 24 часа
            return response()->json(['success' => true, 'enabled' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function disable()
    {
        try {
            Cache::put('auto_check_enabled', false, 86400);
            return response()->json(['success' => true, 'enabled' => false]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function status()
    {
        try {
            $enabled = Cache::get('auto_check_enabled', false);
            $lastRun = Cache::get('auto_check_last_run');

            $nextRun = null;
            if ($enabled && $lastRun) {
                $nextRun = \Carbon\Carbon::parse($lastRun)->addMinutes(30);
            }

            return response()->json([
                'enabled' => $enabled,
                'last_run' => $lastRun,
                'next_run' => $nextRun
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function runNow()
    {
        try {
            Artisan::call('stacks:auto-check');
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Автопроверка запущена',
                'output' => $output
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
