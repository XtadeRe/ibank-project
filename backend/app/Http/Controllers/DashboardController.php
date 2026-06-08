<?php

namespace App\Http\Controllers;

use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\Client\Pool;

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

            $allStacks = Cache::remember('docker_stacks_list', 3, fn() => $this->dockerAgent->getStacks());

            $stacks = $allStacks;
            if (!empty($this->siteStackName)) {
                $stacks = array_filter($allStacks, fn($stack) => ($stack['name'] ?? '') !== $this->siteStackName);
                $stacks = array_values($stacks);
            }

            $cacheKey = 'dashboard_data_full';

            $agentBaseUrl = rtrim(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'), '/');

                $stacksWithDetails = Cache::remember($cacheKey, 5, function () use ($stacks, $agentBaseUrl) { 
                $sandboxes = Sandbox::select(['id', 'name', 'git_branch', 'version', 'status', 'created_at'])->limit(50)->get();
                $sandboxesMap = $sandboxes->keyBy('name')->toArray();

                $containersData = [];

                if (!empty($stacks)) {
                    $stacksToQuery = [];
                    foreach ($stacks as $stack) {
                        if (!empty($stack['name'] ?? '')) {
                            $stacksToQuery[] = $stack;
                        }
                    }
                    $responses = Http::pool(fn (Pool $pool) => array_map(
                        fn($stack) => $pool->get("{$agentBaseUrl}/api/stacks/" . urlencode($stack['name']) . '/info'),
                        $stacksToQuery
                    ));

                    // Обрабатываем ответы
                    foreach ($stacksToQuery as $idx => $stack) {
                        $response = $responses[$idx] ?? null;
                        $stackName = $stack['name'];
                        $containersData[$stackName] = [];
                        if ($response && $response->successful()) {
                            $containersData[$stackName] = $response->json()['containers'] ?? [];
                        }
                    }
                    Log::info('Fetched containers for ' . count($stacksToQuery) . ' stacks');
                }


                $result = [];
                foreach ($stacks as $stack) {
                    $stackName = $stack['name'] ?? null;
                    if ($stackName === null) continue;

                    $containers = $containersData[$stackName] ?? [];
                    $sandbox = $sandboxesMap[$stackName] ?? null;

                    $result[] = [
                        'id' => $sandbox['id'] ?? null,
                        'name' => $stackName,
                        'git_branch' => $sandbox['git_branch'] ?? 'develop',
                        'version' => $sandbox['version'] ?? 'v1.0.0',
                        'status' => $sandbox['status'] ?? 'unknown',
                        'containers' => $containers,
                        'created_at' => $sandbox['created_at'] ?? null,
                    ];
                }

                return $result;
            });

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
}

