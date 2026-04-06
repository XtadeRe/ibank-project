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
     * Получить ветки через Git команду
     */
    private function getBranchesFromGit()
    {
        try {
            $tempDir = storage_path('app/temp_repo_' . time());

            // Клонируем репозиторий (только для получения веток)
            $cloneCmd = "git clone --depth 1 https://github.com/XtadeRe/ibank-project.git {$tempDir} 2>&1";
            exec($cloneCmd, $output, $returnCode);

            if ($returnCode !== 0) {
                throw new \Exception('Failed to clone repository');
            }

            // Получаем список веток
            $branchesCmd = "cd {$tempDir} && git branch -r";
            exec($branchesCmd, $branchesOutput);

            // Удаляем временную папку
            exec("rm -rf {$tempDir}");

            // Парсим ветки
            $branches = [];
            foreach ($branchesOutput as $line) {
                $branch = trim(str_replace('origin/', '', $line));
                if ($branch && !str_contains($branch, 'HEAD') && $branch !== '') {
                    $branches[] = $branch;
                }
            }

            $branches = array_unique($branches);

            if (empty($branches)) {
                return ['main', 'master', 'develop', 'createStack'];
            }

            Log::info('Git branches loaded: ' . count($branches));
            return array_values($branches);

        } catch (\Exception $e) {
            Log::error('Ошибка получения веток через Git: ' . $e->getMessage());
            return ['main', 'master', 'develop', 'createStack'];
        }
    }

    /**
     * Получить ветки из кэша или фиксированный список
     */
    public function getBranchesCached()
    {
        // Используем кэш для уменьшения количества запросов
        return \Illuminate\Support\Facades\Cache::remember('github_branches', 3600, function () {
            return $this->getBranches();
        });
    }
}
