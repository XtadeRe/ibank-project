<?php

namespace App\Http\Controllers;

use App\Models\Sandbox;
use App\Services\DockerAgentService; // Убедитесь, что импортировали
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    private $dockerAgent;

    // Предположим, имя стека вашего сайта хранится в переменной окружения
    private $siteStackName;

    public function __construct()
    {
        $this->dockerAgent = new DockerAgentService(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'));
        // Получаем имя стека из .env или задаём жёстко, например: 'frontend_stack'
        $this->siteStackName = env('SITE_STACK_NAME', '');
    }

    public function getDashboardData()
    {
        try {
            $startTime = microtime(true);

            $allStacks = $this->dockerAgent->getStacks();

            // --- ФИЛЬТРАЦИЯ: Исключаем стек сайта ---
            $stacks = $allStacks;
            if (!empty($this->siteStackName)) {
                $stacks = array_filter($allStacks, function ($stack) {
                    // Предполагается, что $stack - это массив с ключом 'name'
                    return $stack['name'] !== $this->siteStackName;
                });
                // array_filter может изменить индексы, array_values восстанавливает их
                $stacks = array_values($stacks);
            }
            // ------------------------------

            $sandboxes = Sandbox::all();

            $sandboxesMap = [];
            foreach ($sandboxes as $sandbox) {
                $sandboxesMap[$sandbox->name] = $sandbox;
            }

            // Контейнеры для всех (оставшихся) стеков
            $stacksWithDetails = [];
            foreach ($stacks as $stack) {
                // Проверяем существование ключа на всякий случай
                $stackName = $stack['name'] ?? null;
                if ($stackName === null) {
                    Log::warning('Stack with no name found, skipping.', ['stack_data' => $stack]);
                    continue; // Пропускаем стек без имени
                }

                $containers = $this->dockerAgent->getContainersByStack($stackName);
                $sandbox = $sandboxesMap[$stackName] ?? null;

                $stacksWithDetails[] = [
                    'id' => $sandbox?->id,
                    'name' => $stackName, // Используем $stackName для ясности
                    'git_branch' => $sandbox?->git_branch ?? 'develop',
                    'version' => $sandbox?->version ?? 'v1.0.0',
                    'status' => $sandbox?->status ?? 'unknown',
                    'containers' => $containers,
                    'created_at' => $sandbox?->created_at,
                ];
            }

            $duration = round((microtime(true) - $startTime) * 1000);
            Log::info("Dashboard data loaded in {$duration}ms, filtered out " . (count($allStacks) - count($stacks)) . " stacks.");

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

    public function getBranchData()
    {
        try {
            $branchesData = $this->dockerAgent->getBranchesCached();

            if (empty($branchesData) || !is_array($branchesData)) {
                $branchesData = ['master', 'develop', 'createStack'];
            }

            $branchesData = array_filter($branchesData, function($branch) {
                return $branch !== null && !empty($branch);
            });

            $branchesData = array_values($branchesData);

            Log::info('Branch data fetched: ' . count($branchesData) . ' branches');

            return response()->json([
                'status' => 'success',
                'data' => $branchesData
            ]);

        } catch (\Exception $e) {
            Log::error('Error getting branch data: ' . $e->getMessage());

            return response()->json([
                'status' => 'success',
                'data' => ['master', 'develop', 'createStack'],
                'warning' => 'Using default branches'
            ]);
        }
    }
}
