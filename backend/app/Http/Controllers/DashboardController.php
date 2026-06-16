<?php

namespace App\Http\Controllers;

use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    private $dockerAgent;
    private $siteStackName;

    public function __construct()
    {
        $this->dockerAgent = new DockerAgentService(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'));
        $this->siteStackName = env('SITE_STACK_NAME', '');
    }

    public function getDashboardData()
    {
        try {
            $startTime = microtime(true);

            // Получаем список стеков из Docker
            $allStacks = Cache::remember('docker_stacks_list', 3, fn() => $this->dockerAgent->getStacks());

            // Получаем sandboxes из БД
            $sandboxes = Sandbox::select(['id', 'name', 'git_branch', 'version', 'status', 'created_at'])
                ->limit(50)
                ->get()
                ->keyBy('name')
                ->toArray();

            // Объединяем данные из Docker и БД
            $stacksWithDetails = [];
            foreach ($allStacks as $stack) {
                $stackName = $stack['name'] ?? null;
                if ($stackName === null) continue;

                // Пропускаем orchestrator если нужно
                if (!empty($this->siteStackName) && $stackName === $this->siteStackName) {
                    continue;
                }

                $sandbox = $sandboxes[$stackName] ?? null;

                // Получаем актуальные контейнеры для стека
                $containers = $this->dockerAgent->getContainersByStack($stackName);
                
                // Обновляем статус на основе контейнеров
                $status = $this->determineStackStatus($containers);
                
                $stacksWithDetails[] = [
                    'id' => $sandbox['id'] ?? $stack['id'] ?? null,
                    'name' => $stackName,
                    'git_branch' => $sandbox['git_branch'] ?? $stack['git_branch'] ?? 'develop',
                    'version' => $sandbox['version'] ?? $stack['version'] ?? 'v1.0.0',
                    'status' => $sandbox['status'] ?? $status ?? 'unknown',
                    'containers' => !empty($containers) ? $containers : ($stack['containers'] ?? []),
                    'created_at' => $sandbox['created_at'] ?? $stack['created_at'] ?? null,
                ];
            }

            // Сортируем стеки по имени
            usort($stacksWithDetails, function($a, $b) {
                return strcmp($a['name'], $b['name']);
            });

            $duration = round((microtime(true) - $startTime) * 1000);
            Log::info("Dashboard data loaded in {$duration}ms");

            return response()->json([
                'success' => true,
                'stacks' => $stacksWithDetails,
                'duration_ms' => $duration
            ]);

        } catch (\Exception $e) {
            Log::error('Error loading dashboard: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'stacks' => []
            ], 500);
        }
    }

    private function determineStackStatus($containers)
    {
        if (empty($containers)) {
            return 'stopped';
        }

        $allRunning = true;
        $anyRunning = false;

        foreach ($containers as $container) {
            $state = $container['state'] ?? '';
            if ($state === 'running') {
                $anyRunning = true;
            } else {
                $allRunning = false;
            }
        }

        if ($allRunning && $anyRunning) {
            return 'running';
        } elseif ($anyRunning) {
            return 'partial';
        } else {
            return 'stopped';
        }
    }
}