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

// Управление стеком
Route::post('/sandboxes/{id}/restart', [SandboxController::class, 'restart']);
Route::post('/sandboxes/{id}/check-health', [SandboxController::class, 'checkHealth']);

// Докер агент
Route::prefix('docker')->group(function () {
    Route::post('/containers/{containerId}/restart', [DockerAgentController::class, 'restartContainer']);
    Route::post('/stacks/{stackName}/delete', [DockerAgentController::class, 'deleteStack']);
});

// История
Route::get('/history', [HistoryController::class, 'getHistory']);

// Дженкинс
Route::post('/jenkins/deploy', [JenkinsController::class, 'deploy']);
Route::get('/jenkins/jobs', [JenkinsController::class, 'getJobs']);
