<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DockerAgentService
{
    private $baseUrl;

    public function __construct($baseUrl)
    {
        $this->baseUrl = $baseUrl;
    }


    public function startStack($name, $branch, $type)
    {
        try {
            $response = Http::timeout(60)->post($this->baseUrl . "/api/stacks/{$name}/up", [
                'git_branch' => $branch,
                'stackType' => $type
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'success' => false,
                'error' => 'Агент вернул ошибку: ' . ($response->json()['error'] ?? 'Unknown')
            ];
        } catch (\Exception $e) {
            Log::error("startStack error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Не удалось связаться с Docker-агентом'
            ];
        }
    }

    public function restartStack($stackName)
    {
        try {
            $response = Http::timeout(60)->post($this->baseUrl . "/api/stacks/{$stackName}/restart");

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'success' => false,
                'error' => 'Агент вернул ошибку: ' . ($response->json()['error'] ?? 'Unknown')
            ];
        } catch (\Exception $e) {
            Log::error("restartStack error for {$stackName}: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Не удалось связаться с Docker-агентом'
            ];
        }
    }

    /**
     * Получить список стеков
     */
    public function getStacks()
    {
        try {
            $response = Http::timeout(10)->get($this->baseUrl . '/api/stacks');
            if ($response->successful()) {
                return $response->json()['stacks'] ?? [];
            }
            return [];
        } catch (\Exception $e) {
            Log::error('getStacks error: ' . $e->getMessage());
            return [];
        }
    }

    public function getContainersByStack($stackName)
    {
        try {
            $response = Http::timeout(10)->get($this->baseUrl . '/api/stacks/' . $stackName . '/info');
            if ($response->successful()) {
                return $response->json()['containers'] ?? [];
            }
            return [];
        } catch (\Exception $e) {
            Log::error("getContainersByStack for {$stackName} error: " . $e->getMessage());
            return [];
        }
    }

    public function deleteStack($stackName)
    {
        try {
            $response = Http::timeout(30)->post($this->baseUrl . "/api/stacks/{$stackName}/delete");

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'success' => false,
                'error' => 'Агент вернул ошибку: ' . ($response->json()['error'] ?? 'Unknown')
            ];
        } catch (\Exception $e) {
            Log::error("deleteStack error for {$stackName}: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Не удалось связаться с Docker-агентом'
            ];
        }
    }

    public function getBranches()
    {
        try {
            // GitHub API с токеном
            $token = config('services.github.token');

            $response = Http::withOptions([
                'verify' => false, // Отключаем SSL верификацию для локальной разработки
            ])->timeout(10);

            if ($token) {
                $response = $response->withToken($token);
            }

            $response = $response->get('https://api.github.com/repos/XtadeRe/ibank-project/branches');

            if ($response->successful()) {
                $branches = collect($response->json())->pluck('name')->toArray();

                if (!empty($branches)) {
                    Log::info('GitHub branches loaded: ' . count($branches));
                    return $branches;
                }
            }

            // Если GitHub API не работает, используем Git команду
            return $this->getBranchesFromGit();

        } catch (\Exception $e) {
            Log::error('Ошибка получения веток из GitHub: ' . $e->getMessage());
            return $this->getBranchesFromGit();
        }
    }

    /**
     * Получить ветки через Git команду - УДАЛЕН для производительности
     * Используем только GitHub API или статический список
     */
    private function getBranchesFromGit()
    {
        Log::warning('Git clone fallback disabled for performance - using static branches');
        return ['main', 'master', 'develop', 'createStack', 'feature/*'];
    }

    /**
     * Получить ветки из кэша или фиксированный список
     */
    public function getBranchesCached()
    {
        // Увеличили кэш до 24h для снижения нагрузки
        return \Illuminate\Support\Facades\Cache::remember('github_branches', 86400, function () {
            return $this->getBranches();
        });
    }
}
