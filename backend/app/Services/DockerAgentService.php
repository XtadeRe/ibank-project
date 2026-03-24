<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DockerAgentService
{
    protected $agentUrl;

    public function __construct($agentUrl)
    {
        $this->agentUrl = $agentUrl;
    }

    public function ping()
    {
        try {
            $response = Http::timeout(3)->get($this->agentUrl . '/api/health');
            return $response->json();
        } catch (\Exception $e) {
            Log::error('Docker Agent ping failed: ' . $e->getMessage());
            return null;
        }
    }

    public function startStack($name, $gitBranch, $stackType)
    {
        try {
            Log::info('Начинаем создание стека через Docker Agent', [
                'name' => $name,
                'branch' => $gitBranch,
                'type' => $stackType,
                'url' => $this->agentUrl
            ]);

            // Отправляем запрос в Docker Agent (server.js)
            $response = Http::timeout(120)
                ->post($this->agentUrl . '/api/stacks/' . $name . '/up', [
                    'git_branch' => $gitBranch,
                    'stackType' => $stackType
                ]);

            $result = $response->json();

            Log::info('Ответ от Docker Agent', [
                'success' => $response->successful(),
                'response' => $result
            ]);

            if ($response->successful() && isset($result['success']) && $result['success']) {
                return [
                    'success' => true,
                    'data' => $result,
                    'ports' => $result['ports'] ?? null,
                    'urls' => $result['urls'] ?? null
                ];
            }

            return [
                'success' => false,
                'error' => $result['error'] ?? 'Неизвестная ошибка'
            ];

        } catch (\Exception $e) {
            Log::error('Ошибка запуска стека: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function restartContainer($containerId)
    {
        try {
            $response = Http::timeout(30)->post($this->agentUrl . '/api/containers/' . $containerId . '/restart');
            return $response->json();
        } catch (\Exception $e) {
            Log::error('Ошибка перезапуска контейнера: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function getContainers()
    {
        try {
            $response = Http::timeout(10)->get($this->agentUrl . '/api/containers');
            return $response->json() ?? [];
        } catch (\Exception $e) {
            Log::error('Ошибка получения контейнеров: ' . $e->getMessage());
            return [];
        }
    }

    public function deleteStack($stackName)
    {
        try {
            $response = Http::timeout(30)->post($this->agentUrl . '/api/stacks/' . $stackName . '/delete');

            if ($response->successful()) {
                return [
                    'success' => true,
                    'data' => $response->json()
                ];
            }

            return [
                'success' => false,
                'error' => 'Failed to delete stack: ' . $response->body()
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function getBranches()
    {
        try {
            // Получаем ветки из GitHub API
            $response = Http::timeout(10)->get('https://api.github.com/repos/XtadeRe/ibank-project/branches');

            if ($response->successful()) {
                $branches = array_map(function($branch) {
                    return $branch['name'];
                }, $response->json());
                return $branches;
            }

            // Fallback на стандартные ветки
            return ['master', 'develop'];

        } catch (\Exception $e) {
            Log::error('Ошибка получения веток: ' . $e->getMessage());
            return ['master', 'develop'];
        }
    }

    /**
     * Получить контейнеры по имени стека
     */
    public function getContainersByStack($stackName)
    {
        try {
            $allContainers = $this->getContainers();

            // Фильтруем контейнеры, которые принадлежат стеку
            $stackContainers = array_filter($allContainers, function($container) use ($stackName) {
                return strpos($container['name'], $stackName . '_') === 0;
            });

            return array_values($stackContainers);
        } catch (\Exception $e) {
            Log::error('Ошибка получения контейнеров стека: ' . $e->getMessage());
            return [];
        }
    }
}
