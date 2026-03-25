<?php

use App\Http\Controllers\DockerAgentController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\JenkinsController;
use App\Http\Controllers\SandboxController;
use App\Http\Controllers\StackController;
use App\Models\History;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AutoCheckController;

// API для Docker Agent
Route::prefix('docker')->group(function () {
    Route::get('/containers', [DockerAgentController::class, 'getContainers']);
    Route::get('/stacks/{stackName}/containers', [DockerAgentController::class, 'getStackContainers']);
    Route::post('/containers/{containerId}/restart', [DockerAgentController::class, 'restartContainer']);
    Route::post('/stacks/{stackName}/delete', [DockerAgentController::class, 'deleteStack']);
    Route::post('/create-test-container', [DockerAgentController::class, 'createTestContainer']);
});

// REST API для стеков
Route::apiResource('sandboxes', SandboxController::class);

Route::get('/git-branches', [SandboxController::class, 'getBranches']);

// Дополнительные методы для стеков

////Запустить стек
Route::post('/sandboxes/{id}/start', [SandboxController::class, 'start']);
////Остановить стек
Route::post('/sandboxes/{id}/stop', [SandboxController::class, 'stop']);
////Перезапустить стек
Route::post('/sandboxes/{id}/restart', [SandboxController::class, 'restart']);


// История
Route::get('/history', [HistoryController::class, 'getHistory']);

// График
Route::get('/sandboxes/{id}/uptime', [SandboxController::class, 'getUptimeStats']);
Route::post('/sandboxes/{id}/check-health', [SandboxController::class, 'checkHealth']);

// Jenkins
Route::post('/jenkins/deploy', [JenkinsController::class, 'deploy']);
Route::get('/jenkins/jobs', [JenkinsController::class, 'getJobs']);
Route::post('/jenkins/webhook', [JenkinsController::class, 'webhook']);
Route::get('/git-branches', [JenkinsController::class, 'getBranches']);


// Маршруты для управления стеками через Docker Agent
Route::prefix('stacks')->group(function () {
    Route::get('/', [StackController::class, 'index']);
    Route::get('/{name}', [StackController::class, 'show']);
    Route::post('/', [StackController::class, 'store']);
    Route::delete('/{name}', [StackController::class, 'destroy']);
});

// Автопроверка
Route::prefix('auto-check')->group(function () {
    Route::post('/enable', [AutoCheckController::class, 'enable']);
    Route::post('/disable', [AutoCheckController::class, 'disable']);
    Route::get('/status', [AutoCheckController::class, 'status']);
});
