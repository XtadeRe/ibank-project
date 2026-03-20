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
            Log::info('Начинаем создание стека', [
                'name' => $name,
                'branch' => $gitBranch,
                'type' => $stackType
            ]);

            $composeFile = $this->getComposeContent($gitBranch, $stackType, $name);

            Log::info('Отправляю compose файл в Docker Agent', [
                'length' => strlen($composeFile)
            ]);

            $response = Http::timeout(60)
                ->post($this->agentUrl . '/api/stacks/' . $name . '/up', [
                    'composeFile' => $composeFile,
                    'stackType' => $stackType
                ]);

            return [
                'success' => $response->successful(),
                'data' => $response->json()
            ];

        } catch (\Exception $e) {
            Log::error('Ошибка запуска стека: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    private function getComposeContent($gitBranch, $stackType, $name)
    {
        $repoUrl = 'https://raw.githubusercontent.com/XtadeRe/ibank-project/' . $gitBranch . '/';

        switch ($stackType) {
            case 'full':
                $file = 'docker-compose.ib.yml';
                break;
            case 'api':
                $file = 'docker-compose.api.yml';
                break;
            case 'mysql':
                $file = 'docker-compose.yml';
                break;
            default:
                $file = 'docker-compose.ib.yml';
        }

        Log::info('Загрузка compose файла', [
            'branch' => $gitBranch,
            'type' => $stackType,
            'file' => $file,
            'url' => $repoUrl . $file
        ]);

        $response = Http::get($repoUrl . $file);

        Log::info('Результат загрузки', [
            'status' => $response->status(),
            'success' => $response->successful()
        ]);

        if (!$response->successful()) {
            throw new \Exception("Не удалось загрузить compose файл {$file} для ветки {$gitBranch}. Status: " . $response->status());
        }

        $content = $response->body();

        Log::info('Compose файл загружен', [
            'length' => strlen($content),
            'preview' => substr($content, 0, 200)
        ]);

        $content = str_replace(
            ['${STACK_NAME}', '${DB_NAME}', '${DB_USER}', '${DB_PASSWORD}', '${DB_ROOT_PASSWORD}'],
            [$name, 'sandbox', 'user', 'password', 'rootpassword'],
            $content
        );

        return $content;
    }

    public function restartContainer($containerId)
    {
        try {
            $response = Http::timeout(30)->post($this->agentUrl . '/api/containers/' . $containerId . '/restart');

            return [
                'success' => $response->successful(),
                'data' => $response->json()
            ];
        } catch (\Exception $e) {
            Log::error('Ошибка перезапуска контейнера: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    public function getContainers()
    {
        $response = Http::get($this->agentUrl . '/api/containers');
        return $response->json();
    }

    public function deleteStack($name)
    {
        try {
            $response = Http::timeout(30)->post($this->agentUrl . '/api/stacks/' . $name . '/down');

            return $response->json();
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public function checkBranchExists($gitBranch)
    {
        try {
            $url = 'https://raw.githubusercontent.com/XtadeRe/ibank-project/' . $gitBranch . '/docker-compose.yml';
            $response = Http::timeout(5)->head($url);
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    public function getBranches()
    {
        try {
            $response = Http::get('https://api.github.com/repos/XtadeRe/ibank-project/branches');

            if (!$response->successful()) {
                return ['master', 'develop'];
            }

            $branches = array_map(function($branch) {
                return $branch['name'];
            }, $response->json());

            return !empty($branches) ? $branches : ['master', 'develop'];
        } catch (\Exception $e) {
            return ['master', 'develop'];
        }
    }

    public function getContainersByStack($stackName)
    {
        try {
            $allContainers = $this->getContainers();

            $stackContainers = array_filter($allContainers, function($container) use ($stackName) {
                return isset($container['name']) && strpos($container['name'], $stackName . '_') === 0;
            });

            return array_values($stackContainers);

        } catch (\Exception $e) {
            Log::error('Ошибка получения контейнеров стека: ' . $e->getMessage());
            return [];
        }
    }
}
