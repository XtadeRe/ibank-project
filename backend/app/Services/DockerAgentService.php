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
            $token = config('services.github.token');

            $response = Http::withToken($token)
            ->timeout(10)
                ->get('https://api.github.com/repos/XtadeRe/ibank-project/branches');

            $branches = collect($response->json())->pluck('name')->toArray();

            return $branches;


        } catch (\Exception $e) {
            Log::error('Ошибка получения веток: ' . $e->getMessage());
            return ['master', 'develop'];
        }
    }
}
