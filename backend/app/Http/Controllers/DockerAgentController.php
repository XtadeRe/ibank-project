<?php

namespace App\Http\Controllers;
use App\Models\History;
use App\Models\Sandbox;
use App\Services\DockerAgentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class DockerAgentController extends Controller
{
    private $dockerAgent;

    public function __construct()
    {
        $dockerAgentUrl = env('DOCKER_AGENT_URL', 'http://host.docker.internal:3001');
        $this->dockerAgent = new DockerAgentService($dockerAgentUrl);
    }

    /**
     * Получить список всех стеков
     */
    public function getStacks()
    {
        try {
            $stacks = cache()->remember('docker_stacks', 5, function () {
                return $this->dockerAgent->getStacks();
            });

            return response()->json([
                'success' => true,
                'stacks' => $stacks
            ]);
        } catch (\Exception $e) {
            Log::error('Ошибка получения стеков: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'stacks' => []
            ], 500);
        }
    }

    public function getStacksWithDetails()
    {
        try {
            // Получаем все стеки
            $stacks = $this->dockerAgent->getStacks();

            // Параллельно получаем контейнеры для всех стеков
            $stacksWithDetails = [];
            foreach ($stacks as $stack) {
                $containers = $this->dockerAgent->getContainersByStack($stack['name']);
                $stacksWithDetails[] = [
                    'id' => $stack['id'] ?? null,
                    'name' => $stack['name'],
                    'git_branch' => $stack['git_branch'] ?? 'develop',
                    'version' => $stack['version'] ?? 'v1.0.0',
                    'containers' => $containers
                ];
            }

            return response()->json([
                'success' => true,
                'stacks' => $stacksWithDetails
            ]);
        } catch (\Exception $e) {
            Log::error('Ошибка получения стеков с деталями: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'stacks' => []
            ], 500);
        }
    }
    /**
     * Получить все контейнеры
     */
    public function getContainers()
    {
        try {
            $containers = $this->dockerAgent->getContainers();
            return response()->json([
                'success' => true,
                'containers' => $containers
            ]);
        } catch (\Exception $e) {
            Log::error('Ошибка получения контейнеров: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStackContainers($stackName)
    {
        try {
            $containers = $this->dockerAgent->getContainersByStack($stackName);

            return response()->json([
                'success' => true,
                'containers' => $containers
            ]);
        } catch (\Exception $e) {
            Log::error('Ошибка получения контейнеров стека: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'containers' => []
            ], 500);
        }
    }

    /**
     * Перезапустить контейнер
     */
    public function restartContainer($containerId): \Illuminate\Http\JsonResponse
    {
        try {
            $result = $this->dockerAgent->restartContainer($containerId);

            if ($result['success']) {
                $containerName = $this->getContainerName($containerId);
                if ($containerName) {
                    $stackName = substr($containerName, 0, strrpos($containerName, '_'));
                    $sandbox = Sandbox::where('name', $stackName)->first();

                    if ($sandbox) {
                        History::log(
                            $sandbox->id,
                            'restart',
                            "Перезапущен контейнер {$containerName}"
                        );
                    }
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Контейнер перезапущен',
                    'data' => $result['data']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'Ошибка перезапуска'
                ], 500);
            }
        } catch (\Exception $e) {
            Log::error('Ошибка перезапуска контейнера: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getContainerName($containerId)
    {
        try {
            $containers = $this->dockerAgent->getContainers();
            foreach ($containers as $container) {
                if ($container['id'] === $containerId) {
                    return $container['name'];
                }
            }
        } catch (\Exception $e) {
            Log::error('Ошибка получения имени контейнера: ' . $e->getMessage());
        }
        return null;
    }

    /**
     * Удалить стек
     */
    public function deleteStack($stackName)
    {
        try {
            $result = $this->dockerAgent->deleteStack($stackName);

            $stackDir = "C:/OSPanel/home/sandbox/docker-agent/docker-stacks/{$stackName}";
            if (is_dir($stackDir)) {
                $this->deleteDirectory($stackDir);
            }

            return response()->json([
                'success' => true,
                'message' => 'Стек удален',
                'data' => $result
            ]);
        } catch (\Exception $e) {
            Log::error('Ошибка удаления стека: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function deleteDirectory($dir)
    {
        if (!file_exists($dir)) {
            return true;
        }

        if (!is_dir($dir)) {
            return unlink($dir);
        }

        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') {
                continue;
            }

            if (!$this->deleteDirectory($dir . DIRECTORY_SEPARATOR . $item)) {
                return false;
            }
        }

        return rmdir($dir);
    }
}
