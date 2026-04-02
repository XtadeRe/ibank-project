<?php

namespace App\Http\Controllers;

use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    private $dockerAgent;

    public function __construct()
    {
        $this->dockerAgent = new DockerAgentService(env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001'));
    }

    public function getDashboardData()
    {
        try {
            $startTime = microtime(true);

            $stacks = $this->dockerAgent->getStacks();
            $sandboxes = Sandbox::all();

            $sandboxesMap = [];
            foreach ($sandboxes as $sandbox) {
                $sandboxesMap[$sandbox->name] = $sandbox;
            }

            // Контейнеры для всех стеков
            $stacksWithDetails = [];
            foreach ($stacks as $stack) {
                $containers = $this->dockerAgent->getContainersByStack($stack['name']);
                $sandbox = $sandboxesMap[$stack['name']] ?? null;

                $stacksWithDetails[] = [
                    'id' => $sandbox?->id,
                    'name' => $stack['name'],
                    'git_branch' => $sandbox?->git_branch ?? 'develop',
                    'version' => $sandbox?->version ?? 'v1.0.0',
                    'status' => $sandbox?->status ?? 'unknown',
                    'containers' => $containers,
                    'created_at' => $sandbox?->created_at,
                ];
            }

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

    public function getBranchData() {

        $branchesData = $this->dockerAgent->getBranches();

        return response()->json([
            'status' => 'success',
            'data' => $branchesData
        ]);
    }
}
