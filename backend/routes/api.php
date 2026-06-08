<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DockerAgentController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\JenkinsController;
use App\Http\Controllers\SandboxController;
use Illuminate\Support\Facades\Route;


// Данные в дашборде
Route::get('/dashboard-data', [DashboardController::class, 'getDashboardData']);
Route::get('/branch-data', [DashboardController::class, 'getBranchData']);

// Управление стеками
Route::apiResource('sandboxes', SandboxController::class);
Route::post('/sandboxes/{id}/restart', [SandboxController::class, 'restart']);
Route::post('/sandboxes/{id}/check-health', [SandboxController::class, 'checkHealth']);
Route::post('/sandboxes/{id}/delete', [SandboxController::class, 'delete']);
// Проверка жизни стека
Route::get('/sandboxes/{id}/uptime', [SandboxController::class, 'uptime']);


// История
Route::get('/history', [HistoryController::class, 'getHistory']);

// Дженкинс
Route::post('/jenkins/deploy', [JenkinsController::class, 'deploy']);


